/**
 * Apollo Sync â Daily Lead Import Cron
 *
 * Fetches fresh contacts from Apollo's People Search API and inserts them
 * into the leads table with pipeline_stage = "Neu" so the Prospect Researcher
 * has a constant supply of new leads to qualify each morning.
 *
 * Target: 50 new leads per run (deduplicated by email).
 * Schedule: 05:00 daily â runs BEFORE the Prospect Researcher at 06:30.
 *
 * Search criteria: DACH region, Bau/Handwerk/Immobilien industries,
 * KMU 1-200 employees, decision-maker titles (GF, Inhaber, CEO).
 *
 * Rotates through Apollo search pages daily to avoid always importing
 * the same contacts. Uses a stored page-cursor in agent_decisions to
 * track progress across runs.
 */
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthorized, sendErrorNotification, writeStartLog, writeEndLog } from '@/lib/agent-runtime';
import { retryApollo } from '@/lib/util/retry';
import { observe } from '@/lib/observability/logger';

export const maxDuration = 60;

// Apollo People Search endpoint.
// URL-History (Apollo aendert den Pfad in hoher Frequenz, ~1x pro Monat):
//   2024 frueh:  /v1/mixed_people/api_search   (urspruenglich)
//   2025 Q4:     /v1/mixed_people/search        (erste Umbenennung)
//   2026-04 Q1:  /api/v1/mixed_people/search    (zweite Umbenennung, neuer Prefix)
//   2026-04-11:  /api/v1/mixed_people/api_search  <-- aktuell, Apollo 422 Deprecation-Error
//                                                    erzwingt den erneuten Rename zurueck.
// Siehe LECK-14 und ERROR-CATALOG.md fuer langfristige Strategie-Notiz.
const APOLLO_API_URL = 'https://api.apollo.io/api/v1/mixed_people/api_search';

// How many contacts to request from Apollo per run
const PER_PAGE = 100;
// How many to actually insert (after dedup)
const TARGET_NEW_LEADS = 50;

// Locations-Liste fuer DACH mit Schweiz beschraenkt auf deutschsprachige Kantone.
// Romandie (Genf, Waadt, Neuenburg, Jura, Wallis, Freiburg) und Tessin sind
// explizit NICHT enthalten. Wird von Configs mit person_locations referenziert.
const LOCATIONS_DACH_DE = [
  // Deutschland gesamt
  'Germany', 'Deutschland',
  // Oesterreich gesamt
  'Austria', 'Oesterreich',
  // Schweiz: nur deutschsprachige Kantone
  'Zurich, Switzerland',
  'Bern, Switzerland',
  'Lucerne, Switzerland',
  'Uri, Switzerland',
  'Schwyz, Switzerland',
  'Obwalden, Switzerland',
  'Nidwalden, Switzerland',
  'Glarus, Switzerland',
  'Zug, Switzerland',
  'Solothurn, Switzerland',
  'Basel, Switzerland',
  'Basel-Landschaft, Switzerland',
  'Schaffhausen, Switzerland',
  'Appenzell, Switzerland',
  'St. Gallen, Switzerland',
  'Graubuenden, Switzerland',
  'Aargau, Switzerland',
  'Thurgau, Switzerland',
];

// Default-Locations (Rueckwaerts-Kompatibilitaet fuer die 4 alten Configs).
// Entspricht dem bisherigen hardcoded Verhalten vor 2026-04-15.
const LOCATIONS_DEFAULT = ['Germany', 'Austria', 'Switzerland', 'Deutschland', 'Oesterreich', 'Schweiz'];

// Config-Typ mit optionalem person_locations Feld. Wenn nicht gesetzt, nutzt
// fetchApolloContacts den LOCATIONS_DEFAULT Wert.
type SearchConfig = {
  label: string;
  industry: string;
  person_titles: string[];
  q_organization_keyword_tags: string[];
  person_locations?: string[];
};

// Rotate through these search configs daily to get variety.
// Bestehende 4 Configs (immobilien-gf, bau-gf, handwerk-gf, immobilien-mgmt)
// bleiben unveraendert. 9 neue Configs 2026-04-15 hinzugefuegt mit
// person_locations = LOCATIONS_DACH_DE.
const SEARCH_CONFIGS: SearchConfig[] = [
  {
    label: 'immobilien-gf',
    industry: 'immobilien',
    person_titles: ['GeschÃ¤ftsfÃ¼hrer', 'Inhaber', 'Geschaeftsfuehrer', 'CEO', 'Founder', 'Managing Director'],
    q_organization_keyword_tags: ['real estate', 'immobilien', 'hausverwaltung', 'makler'],
  },
  {
    label: 'bau-gf',
    industry: 'bauunternehmen',
    person_titles: ['GeschÃ¤ftsfÃ¼hrer', 'Inhaber', 'Geschaeftsfuehrer', 'CEO', 'Founder', 'Bauleiter', 'Projektleiter'],
    q_organization_keyword_tags: ['bau', 'bauunternehmen', 'hochbau', 'tiefbau', 'construction'],
  },
  {
    label: 'handwerk-gf',
    industry: 'handwerk',
    person_titles: ['GeschÃ¤ftsfÃ¼hrer', 'Inhaber', 'Geschaeftsfuehrer', 'Meister', 'CEO', 'Founder'],
    q_organization_keyword_tags: ['handwerk', 'sanitÃ¤r', 'elektro', 'dachdecker', 'maler', 'tischler', 'zimmermann'],
  },
  {
    label: 'immobilien-mgmt',
    industry: 'immobilien',
    person_titles: ['Bereichsleiter', 'Niederlassungsleiter', 'Vertriebsleiter', 'Head of Sales', 'Direktor'],
    q_organization_keyword_tags: ['real estate', 'immobilien', 'projektentwicklung', 'bautraeger'],
  },
  // Neu 2026-04-15: Expansion auf spezifische Branchen mit DACH-DE Fokus
  {
    label: 'immobilien-makler',
    industry: 'immobilien',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'CEO', 'Makler', 'Immobilienmakler', 'Managing Director', 'Founder'],
    q_organization_keyword_tags: ['makler', 'immobilienmakler', 'real estate agent', 'realtor'],
    person_locations: LOCATIONS_DACH_DE,
  },
  {
    label: 'hausverwaltung',
    industry: 'immobilien',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'Hausverwalter', 'Property Manager', 'Verwalter'],
    q_organization_keyword_tags: ['hausverwaltung', 'mieterverwaltung', 'wohnungsverwaltung', 'property management'],
    person_locations: LOCATIONS_DACH_DE,
  },
  {
    label: 'bautraeger',
    industry: 'immobilien',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'Projektentwickler', 'Bautraeger', 'Managing Director'],
    q_organization_keyword_tags: ['bautraeger', 'projektentwicklung', 'projektentwickler', 'real estate developer'],
    person_locations: LOCATIONS_DACH_DE,
  },
  {
    label: 'elektro',
    industry: 'handwerk',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'Elektromeister', 'Meister', 'Founder'],
    q_organization_keyword_tags: ['elektro', 'elektrotechnik', 'elektroinstallation', 'electrical contractor'],
    person_locations: LOCATIONS_DACH_DE,
  },
  {
    label: 'shk',
    industry: 'handwerk',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'SHK-Meister', 'Meister', 'Founder'],
    q_organization_keyword_tags: ['sanitaer', 'heizung', 'klima', 'shk', 'heizungsbau', 'plumbing', 'HVAC'],
    person_locations: LOCATIONS_DACH_DE,
  },
  {
    label: 'maler',
    industry: 'handwerk',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'Malermeister', 'Meister'],
    q_organization_keyword_tags: ['maler', 'malerbetrieb', 'painter', 'painting'],
    person_locations: LOCATIONS_DACH_DE,
  },
  {
    label: 'schreiner-tischler',
    industry: 'handwerk',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'Schreinermeister', 'Tischlermeister', 'Zimmermeister', 'Meister'],
    q_organization_keyword_tags: ['schreiner', 'tischler', 'zimmerei', 'carpenter', 'joiner'],
    person_locations: LOCATIONS_DACH_DE,
  },
  {
    label: 'generalunternehmer',
    industry: 'bauunternehmen',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'Projektleiter', 'Bauleiter', 'Managing Director'],
    q_organization_keyword_tags: ['generalunternehmer', 'general contractor', 'total contractor'],
    person_locations: LOCATIONS_DACH_DE,
  },
  {
    label: 'subunternehmer',
    industry: 'bauunternehmen',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'Projektleiter', 'Founder'],
    q_organization_keyword_tags: ['subunternehmer', 'nachunternehmer', 'subcontractor'],
    person_locations: LOCATIONS_DACH_DE,
  },
  // Expansion Teil 2 (2026-04-15): 5 weitere Branchen-Configs
  {
    label: 'architekten',
    industry: 'bauunternehmen',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'Architekt', 'Projektleiter', 'Managing Director', 'Founder'],
    q_organization_keyword_tags: ['architekt', 'architektur', 'planungsbuero', 'architecture', 'architectural'],
    person_locations: LOCATIONS_DACH_DE,
  },
  {
    label: 'facility-management',
    industry: 'immobilien',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'Facility Manager', 'Objektleiter', 'Property Manager', 'Managing Director'],
    q_organization_keyword_tags: ['facility management', 'gebaeudemanagement', 'facility services', 'building management'],
    person_locations: LOCATIONS_DACH_DE,
  },
  {
    label: 'energie-solar',
    industry: 'handwerk',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'Energieberater', 'Meister', 'Founder', 'Managing Director'],
    q_organization_keyword_tags: ['energieberatung', 'solaranlage', 'photovoltaik', 'solar', 'energieberater', 'erneuerbare energien'],
    person_locations: LOCATIONS_DACH_DE,
  },
  {
    label: 'fenster-tueren-fassaden',
    industry: 'handwerk',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'Meister', 'Vertrieb', 'Managing Director', 'Founder'],
    q_organization_keyword_tags: ['fenster', 'tueren', 'fassade', 'bauelemente', 'windows', 'facade'],
    person_locations: LOCATIONS_DACH_DE,
  },
  {
    label: 'reinigung-hausmeister',
    industry: 'immobilien',
    person_titles: ['Geschaeftsfuehrer', 'Inhaber', 'Betriebsleiter', 'Managing Director', 'Founder'],
    q_organization_keyword_tags: ['reinigungsunternehmen', 'hausmeisterservice', 'gebaeudereinigung', 'facility cleaning'],
    person_locations: LOCATIONS_DACH_DE,
  },
];

interface ApolloContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
  title: string | null;
  linkedin_url: string | null;
  organization: {
    name: string | null;
    website_url: string | null;
    estimated_num_employees: number | null;
    primary_phone?: { number: string | null } | null;
  } | null;
}

async function fetchApolloContacts(
  config: SearchConfig,
  page: number,
  apiKey: string
): Promise<ApolloContact[]> {
  const body = {
    person_titles: config.person_titles,
    // Wenn die Config eigene Locations mitbringt, diese nutzen.
    // Sonst Default = ALLE DACH-Laender (Rueckwaerts-Kompatibel fuer alte Configs).
    person_locations: config.person_locations ?? LOCATIONS_DEFAULT,
    organization_num_employees_ranges: ['1,10', '11,50', '51,200'],
    q_organization_keyword_tags: config.q_organization_keyword_tags,
    per_page: PER_PAGE,
    page,
    prospected_by_current_team: ['no'],
  };

  // Wrap in retryApollo: 5 Versuche mit exponential backoff (siehe
  // lib/util/retry.ts retryApollo). Apollo ist 429-heavy bei Search-
  // Endpoints; short Spikes sollen keine Lead-Imports kosten.
  const data = await retryApollo(async () => {
    const res = await fetch(APOLLO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // Full response text logging (nicht mehr auf 200 Zeichen schneiden).
      // Apollo wechselt URL und Request-Schema in kurzen Intervallen, und der
      // gesamte Error-Text ist oft die einzige Quelle die uns sagt was Apollo
      // diesmal erwartet. Siehe LECK-14 fuer History.
      const text = await res.text();
      console.error(`[apollo-sync] Full Apollo error response (${res.status}):`, text);
      // Status annotieren damit defaultShouldRetry greift (429/5xx retryable,
      // 4xx andere nicht).
      const err = new Error(`Apollo API error ${res.status}: ${text}`);
      Object.assign(err, { status: res.status });
      throw err;
    }

    return await res.json();
  });
  // Apollo kann die Top-Level-Key unterschiedlich benennen: altes Schema war
  // `people`, bei `api_search` koennte es auch `contacts` oder anders heissen.
  // Wir pruefen beide bekannten Varianten und loggen die Root-Keys wenn nichts
  // gefunden wird, damit beim naechsten Schema-Change sofort klar ist was da ist.
  const contacts = (data.people || data.contacts || []) as ApolloContact[];
  if (contacts.length === 0 && data && typeof data === 'object') {
    console.log('[apollo-sync] Apollo response keys:', Object.keys(data));
  }
  return contacts;
}

// Map Apollo industry label to our internal industry values
function mapIndustry(label: string): string {
  if (label === 'bauunternehmen') return 'bauunternehmen';
  if (label === 'handwerk') return 'handwerk';
  return 'immobilien';
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'APOLLO_API_KEY nicht konfiguriert' }, { status: 500 });
  }

  const startTime = Date.now();
  const runId = crypto.randomUUID();
  const today = new Date().toISOString().split('T')[0];
  console.log(`[apollo-sync] Starte Apollo-Sync fuer ${today}...`);
  await writeStartLog(runId, 'apollo_sync');
  observe.info({
    agent: 'lead_ingestor',
    skill: 'apollo.prospect',
    message: 'apollo-sync started',
    context: { run_id: runId, date: today },
  });

  try {
    // Determine which search config to use today (rotate daily)
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const configIndex = dayOfYear % SEARCH_CONFIGS.length;
    const searchConfig = SEARCH_CONFIGS[configIndex];

    // Determine which page to fetch (rotate weekly within each config to get fresh results)
    const weekOfYear = Math.floor(dayOfYear / 7);
    const page = (weekOfYear % 10) + 1; // Pages 1-10, rotating weekly

    console.log(`[apollo-sync] Config: ${searchConfig.label}, Seite: ${page}`);

    // Fetch from Apollo. retryApollo (in fetchApolloContacts) handled schon
    // 429/5xx/Network-Fehler mit 5 Retries. Wenn wir hier im catch landen,
    // ist Apollo wirklich broken - Safe-NoOp Fallback: 0 Leads statt 500,
    // damit der Cron nicht rot markiert wird und die restliche Pipeline
    // (Prospect-Researcher etc.) weiter laeuft.
    let apolloContacts: ApolloContact[] = [];
    try {
      apolloContacts = await fetchApolloContacts(searchConfig, page, apiKey);
    } catch (err) {
      const duration_ms = Date.now() - startTime;
      console.error(`[apollo-sync] Apollo API Fehler nach 5 Retries:`, err);
      // observe.error triggert ntfy + Slack fuer sofortige Angie-Sicht
      await observe.error({
        agent: 'lead_ingestor',
        skill: 'apollo.prospect',
        message: 'apollo-sync failed after retries, safe-noop',
        context: {
          run_id: runId,
          err: err instanceof Error ? err.message : String(err),
          attempts: (err as { attempts?: number }).attempts,
          critical: true,
        },
        duration_ms,
      });
      await sendErrorNotification('Apollo Sync', String(err), Math.round(duration_ms / 1000));
      await writeEndLog(runId, 'apollo_sync', 'error', { error: String(err), stage: 'fetch_apollo' });
      // Safe-NoOp: 200 OK mit inserted=0 + fallback-Flag, kein 500-Trigger
      // fuer Health-Checker. Angie sieht es an der ntfy-Notification.
      return NextResponse.json({
        ok: true,
        inserted: 0,
        fallback: 'safe-noop',
        reason: 'apollo_unavailable_after_retries',
      });
    }

    console.log(`[apollo-sync] Apollo hat ${apolloContacts.length} Kontakte zurueckgegeben`);

    if (apolloContacts.length === 0) {
      await writeEndLog(runId, 'apollo_sync', 'completed', {
        inserted: 0,
        summary: 'Apollo hat keine Kontakte zurueckgegeben',
      });
      return NextResponse.json({ ok: true, inserted: 0, message: 'Apollo hat keine Kontakte zurueckgegeben' });
    }

    // Get existing emails to deduplicate
    // Neon sql`` returns an array directly, not { rows: [] }
    const existingEmailsResult = await sql`SELECT email FROM leads WHERE email IS NOT NULL`;
    const existingEmails = new Set(
      (existingEmailsResult as { email: string }[]).map((r) => r.email.toLowerCase().trim())
    );

    // Also deduplicate by name+company for contacts without email
    const existingNamesResult = await sql`
      SELECT LOWER(first_name || ' ' || last_name || '|' || COALESCE(company, '')) as key
      FROM leads
    `;
    const existingNameKeys = new Set(
      (existingNamesResult as { key: string }[]).map((r) => r.key)
    );

    // Filter and insert new leads
    let inserted = 0;
    let skippedDupe = 0;
    let skippedNoName = 0;

    for (const contact of apolloContacts) {
      if (inserted >= TARGET_NEW_LEADS) break;

      // Skip if no usable name
      const firstName = contact.first_name?.trim() || contact.name?.split(' ')[0]?.trim() || '';
      const lastName =
        contact.last_name?.trim() ||
        (contact.name?.split(' ').slice(1).join(' ')?.trim()) ||
        '';

      if (!firstName && !lastName) {
        skippedNoName++;
        continue;
      }

      // Apollos neuer api_search Endpoint liefert laut Dokumentation
      // keine Email/Phone mehr (Enrichment muss separat ueber den
      // People-Enrichment-Endpoint passieren). Weil leads.email als
      // TEXT UNIQUE NOT NULL definiert ist, wuerde ein null-Insert
      // die Constraint brechen. Fallback: Platzhalter-Email die einen
      // Apollo-Prefix hat, damit Prospect Researcher sie spaeter per
      // web_fetch durch eine echte ersetzen kann.
      const rawEmail = contact.email?.toLowerCase().trim() || null;
      const email = rawEmail || `apollo-${contact.id}@placeholder.praxisnovaai.com`;
      const company = contact.organization?.name?.trim() || null;

      // Dedup by email (rawEmail, nicht Platzhalter: Platzhalter sind immer unique)
      if (rawEmail && existingEmails.has(rawEmail)) {
        skippedDupe++;
        continue;
      }

      // Dedup by name+company (fuer Kontakte mit Platzhalter-Email)
      const nameKey = `${firstName.toLowerCase()} ${lastName.toLowerCase()}|${(company || '').toLowerCase()}`;
      if (existingNameKeys.has(nameKey)) {
        skippedDupe++;
        continue;
      }

      const title = contact.title?.trim() || null;
      const linkedinUrl = contact.linkedin_url?.trim() || null;
      const websiteUrl = contact.organization?.website_url?.trim() || null;
      const employeeCount = contact.organization?.estimated_num_employees || null;
      const industry = mapIndustry(searchConfig.industry);

      try {
        await sql`
          INSERT INTO leads (
            first_name, last_name, email, company, title,
            industry, employee_count, website_url, linkedin_url,
            pipeline_stage, source, created_at
          ) VALUES (
            ${firstName}, ${lastName}, ${email}, ${company}, ${title},
            ${industry}, ${employeeCount}, ${websiteUrl}, ${linkedinUrl},
            'Neu', 'apollo', NOW()
          )
        `;

        inserted++;
        if (email) existingEmails.add(email);
        existingNameKeys.add(nameKey);
      } catch (insertErr) {
        // Log but continue â likely a unique constraint on email
        console.warn(`[apollo-sync] Insert fehlgeschlagen fuer ${firstName} ${lastName}: ${insertErr}`);
      }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[apollo-sync] Fertig in ${elapsed}s â ${inserted} neue Leads eingefuegt, ${skippedDupe} Duplikate, ${skippedNoName} ohne Name`
    );

    // Log the run as a decision so it shows in the dashboard
    try {
      await sql`
        INSERT INTO agent_decisions (
          agent_name, decision_type, subject_company, score, reasoning, status, created_at
        ) VALUES (
          'apollo_sync',
          'lead_import',
          ${searchConfig.label},
          ${inserted},
          ${`Apollo-Sync ${today}: ${inserted} neue Leads importiert (Config: ${searchConfig.label}, Seite: ${page}). ${skippedDupe} Duplikate uebersprungen.`},
          'completed',
          NOW()
        )
      `;
    } catch (_) {
      // Non-critical â don't fail the run if logging fails
    }

    await writeEndLog(runId, 'apollo_sync', 'completed', {
      inserted,
      skipped_dupe: skippedDupe,
      skipped_no_name: skippedNoName,
      config: searchConfig.label,
      page,
      elapsed_seconds: elapsed,
      summary: `${inserted} neue Leads (${skippedDupe} Duplikate, ${skippedNoName} ohne Name) via ${searchConfig.label}`,
    });

    observe.info({
      agent: 'lead_ingestor',
      skill: 'apollo.prospect',
      message: 'apollo-sync completed',
      context: {
        run_id: runId,
        inserted,
        skipped_dupe: skippedDupe,
        config: searchConfig.label,
      },
      duration_ms: Date.now() - startTime,
    });

    return NextResponse.json({
      ok: true,
      inserted,
      skippedDupe,
      skippedNoName,
      config: searchConfig.label,
      page,
      elapsed,
    });
  } catch (err) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`[apollo-sync] Unerwarteter Fehler:`, err);
    await observe.error({
      agent: 'lead_ingestor',
      skill: 'apollo.prospect',
      message: 'apollo-sync unexpected error (post-fetch)',
      context: {
        run_id: runId,
        err: err instanceof Error ? err.message : String(err),
      },
      duration_ms: Date.now() - startTime,
    });
    await writeEndLog(runId, 'apollo_sync', 'error', { error: String(err), elapsed_seconds: elapsed });
    await sendErrorNotification('Apollo Sync', String(err), elapsed);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
