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
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isAuthorized, sendErrorNotification } from '@/lib/agent-runtime';

export const maxDuration = 60;

// Apollo People Search endpoint
const APOLLO_API_URL = 'https://api.apollo.io/v1/mixed_people/search';

// How many contacts to request from Apollo per run
const PER_PAGE = 100;
// How many to actually insert (after dedup)
const TARGET_NEW_LEADS = 50;

// Rotate through these search configs daily to get variety
const SEARCH_CONFIGS = [
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
  config: (typeof SEARCH_CONFIGS)[0],
  page: number,
  apiKey: string
): Promise<ApolloContact[]> {
  const body = {
    api_key: apiKey,
    person_titles: config.person_titles,
    person_locations: ['Germany', 'Austria', 'Switzerland', 'Deutschland', 'Oesterreich', 'Schweiz'],
    organization_num_employees_ranges: ['1,10', '11,50', '51,200'],
    q_organization_keyword_tags: config.q_organization_keyword_tags,
    per_page: PER_PAGE,
    page,
    prospected_by_current_team: ['no'],
  };

  const res = await fetch(APOLLO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.people || []) as ApolloContact[];
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
  const today = new Date().toISOString().split('T')[0];
  console.log(`[apollo-sync] Starte Apollo-Sync fuer ${today}...`);

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

    // Fetch from Apollo
    let apolloContacts: ApolloContact[] = [];
    try {
      apolloContacts = await fetchApolloContacts(searchConfig, page, apiKey);
    } catch (err) {
      console.error(`[apollo-sync] Apollo API Fehler:`, err);
      await sendErrorNotification('Apollo Sync', String(err), Math.round((Date.now() - startTime) / 1000));
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }

    console.log(`[apollo-sync] Apollo hat ${apolloContacts.length} Kontakte zurueckgegeben`);

    if (apolloContacts.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, message: 'Apollo hat keine Kontakte zurueckgegeben' });
    }

    // Get existing emails to deduplicate
    const existingEmailsResult = await sql`SELECT email FROM leads WHERE email IS NOT NULL`;
    const existingEmails = new Set(
      (existingEmailsResult.rows as { email: string }[]).map((r) => r.email.toLowerCase().trim())
    );

    // Also deduplicate by name+company for contacts without email
    const existingNamesResult = await sql`
      SELECT LOWER(first_name || ' ' || last_name || '|' || COALESCE(company, '')) as key
      FROM leads
    `;
    const existingNameKeys = new Set(
      (existingNamesResult.rows as { key: string }[]).map((r) => r.key)
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

      const email = contact.email?.toLowerCase().trim() || null;
      const company = contact.organization?.name?.trim() || null;

      // Dedup by email
      if (email && existingEmails.has(email)) {
        skippedDupe++;
        continue;
      }

      // Dedup by name+company (for contacts without email)
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
    await sendErrorNotification('Apollo Sync', String(err), elapsed);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
