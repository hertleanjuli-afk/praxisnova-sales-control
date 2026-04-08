// ============================================================
// PraxisNova - HubSpot One-Way Sync Client
// Synkt Leads, Activities, Deals von unserem System zu HubSpot Free CRM
// ============================================================

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY || '';
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

interface HubSpotContactProperties {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  mobilephone?: string;
  company?: string;
  jobtitle?: string;
  industry?: string;
  website?: string;
  hs_lead_status?: string;
  lifecyclestage?: string;
  // Custom Properties (muessen in HubSpot erstellt werden)
  agent_score?: string;
  lead_category?: string;
  outreach_step?: string;
  linkedin_status?: string;
  total_call_attempts?: string;
  praxisnova_lead_id?: string;
}

interface HubSpotNoteProperties {
  hs_note_body: string;
  hs_timestamp: string;
}

interface HubSpotDealProperties {
  dealname: string;
  dealstage: string;
  pipeline: string;
  amount?: string;
}

// ============================================================
// Helper: API Request
// ============================================================
async function hubspotRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  if (!HUBSPOT_API_KEY) {
    console.warn('[hubspot] HUBSPOT_API_KEY nicht gesetzt - Sync uebersprungen');
    return { ok: false, error: 'HUBSPOT_API_KEY nicht konfiguriert' };
  }

  try {
    const res = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[hubspot] ${method} ${path} fehlgeschlagen: ${res.status}`, errorText);
      return { ok: false, error: `${res.status}: ${errorText}` };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (e) {
    console.error('[hubspot] Request Fehler:', e);
    return { ok: false, error: String(e) };
  }
}

// ============================================================
// Contact Sync: Neuen Lead zu HubSpot senden
// ============================================================
export async function syncContactToHubSpot(lead: {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  mobile_phone?: string;
  company?: string;
  title?: string;
  industry?: string;
  website_url?: string;
  agent_score?: number;
  pipeline_stage?: string;
  lead_category?: string;
  outreach_step?: string;
  linkedin_url?: string;
  total_call_attempts?: number;
}): Promise<{ ok: boolean; hubspot_id?: string; error?: string }> {
  const properties: HubSpotContactProperties = {
    email: lead.email,
    firstname: lead.first_name || '',
    lastname: lead.last_name || '',
    phone: lead.phone || '',
    mobilephone: lead.mobile_phone || '',
    company: lead.company || '',
    jobtitle: lead.title || '',
    industry: lead.industry || '',
    website: lead.website_url || '',
    hs_lead_status: mapPipelineToHubSpot(lead.pipeline_stage),
    lifecyclestage: 'lead',
    agent_score: String(lead.agent_score || 0),
    lead_category: lead.lead_category || '',
    outreach_step: lead.outreach_step || 'new',
    total_call_attempts: String(lead.total_call_attempts || 0),
    praxisnova_lead_id: String(lead.id),
  };

  const result = await hubspotRequest('POST', '/crm/v3/objects/contacts', {
    properties,
  });

  if (result.ok && result.data) {
    const hubspotId = (result.data as { id?: string }).id;
    return { ok: true, hubspot_id: hubspotId };
  }

  // Wenn Contact schon existiert (409 Conflict), versuche Update
  if (result.error?.includes('409')) {
    return updateContactInHubSpot(lead.email, properties);
  }

  return { ok: false, error: result.error };
}

// ============================================================
// Contact Update: Bestehenden Contact in HubSpot aktualisieren
// ============================================================
async function updateContactInHubSpot(
  email: string,
  properties: HubSpotContactProperties
): Promise<{ ok: boolean; hubspot_id?: string; error?: string }> {
  // Erst Contact-ID per Email finden
  const searchResult = await hubspotRequest('POST', '/crm/v3/objects/contacts/search', {
    filterGroups: [{
      filters: [{
        propertyName: 'email',
        operator: 'EQ',
        value: email,
      }],
    }],
    limit: 1,
  });

  if (!searchResult.ok || !searchResult.data) {
    return { ok: false, error: 'Contact nicht gefunden' };
  }

  const results = (searchResult.data as { results?: { id: string }[] }).results;
  if (!results || results.length === 0) {
    return { ok: false, error: 'Contact nicht in HubSpot' };
  }

  const contactId = results[0].id;

  const updateResult = await hubspotRequest(
    'PATCH',
    `/crm/v3/objects/contacts/${contactId}`,
    { properties }
  );

  if (updateResult.ok) {
    return { ok: true, hubspot_id: contactId };
  }

  return { ok: false, error: updateResult.error };
}

// ============================================================
// Activity Log: Anruf, Email, LinkedIn-Aktion loggen
// ============================================================
export async function logActivityToHubSpot(
  hubspotContactId: string,
  activityType: 'call' | 'email' | 'linkedin' | 'note',
  content: string,
  timestamp?: Date
): Promise<{ ok: boolean; error?: string }> {
  const ts = (timestamp || new Date()).toISOString();

  // Note erstellen
  const noteResult = await hubspotRequest('POST', '/crm/v3/objects/notes', {
    properties: {
      hs_note_body: `[${activityType.toUpperCase()}] ${content}`,
      hs_timestamp: ts,
    } as HubSpotNoteProperties,
  });

  if (!noteResult.ok) {
    return { ok: false, error: noteResult.error };
  }

  const noteId = (noteResult.data as { id?: string })?.id;
  if (!noteId) return { ok: false, error: 'Note ID fehlt' };

  // Note mit Contact verknuepfen
  const assocResult = await hubspotRequest(
    'PUT',
    `/crm/v3/objects/notes/${noteId}/associations/contacts/${hubspotContactId}/note_to_contact`,
    {}
  );

  return { ok: assocResult.ok, error: assocResult.error };
}

// ============================================================
// Deal erstellen (bei Termin-Buchung)
// ============================================================
export async function createDealInHubSpot(
  hubspotContactId: string,
  leadName: string,
  company: string,
  stage: string
): Promise<{ ok: boolean; deal_id?: string; error?: string }> {
  const dealResult = await hubspotRequest('POST', '/crm/v3/objects/deals', {
    properties: {
      dealname: `${company} - ${leadName}`,
      dealstage: mapDealStage(stage),
      pipeline: 'default',
    } as HubSpotDealProperties,
  });

  if (!dealResult.ok) {
    return { ok: false, error: dealResult.error };
  }

  const dealId = (dealResult.data as { id?: string })?.id;
  if (!dealId) return { ok: false, error: 'Deal ID fehlt' };

  // Deal mit Contact verknuepfen
  await hubspotRequest(
    'PUT',
    `/crm/v3/objects/deals/${dealId}/associations/contacts/${hubspotContactId}/deal_to_contact`,
    {}
  );

  return { ok: true, deal_id: dealId };
}

// ============================================================
// Batch Sync: Mehrere Leads auf einmal synken
// ============================================================
export async function batchSyncContactsToHubSpot(
  leads: Array<{
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    company?: string;
    agent_score?: number;
    pipeline_stage?: string;
    [key: string]: unknown;
  }>
): Promise<{ synced: number; failed: number; errors: string[] }> {
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    const result = await syncContactToHubSpot(lead);
    if (result.ok) {
      synced++;
    } else {
      failed++;
      errors.push(`Lead ${lead.id} (${lead.email}): ${result.error}`);
    }
    // Rate limiting: 100ms Pause zwischen Requests
    await new Promise(r => setTimeout(r, 100));
  }

  return { synced, failed, errors };
}

// ============================================================
// Hilfsfunktionen
// ============================================================

function mapPipelineToHubSpot(stage?: string): string {
  const map: Record<string, string> = {
    'Neu': 'NEW',
    'In Outreach': 'OPEN',
    'Replied': 'IN_PROGRESS',
    'Booked': 'QUALIFIED',
    'Blocked': 'UNQUALIFIED',
    'Nurture': 'OPEN',
    'Nicht qualifiziert': 'UNQUALIFIED',
  };
  return map[stage || ''] || 'NEW';
}

function mapDealStage(stage: string): string {
  const map: Record<string, string> = {
    'booked': 'appointmentscheduled',
    'interesse': 'qualifiedtobuy',
    'angebot': 'presentationscheduled',
    'abgeschlossen': 'closedwon',
    'verloren': 'closedlost',
  };
  return map[stage] || 'appointmentscheduled';
}

// ============================================================
// Sync-Wrapper mit Logging (fuer DB-Logging)
// ============================================================
export async function syncWithLogging(
  sql: typeof import('@/lib/db').default,
  entityType: string,
  entityId: number,
  action: string,
  syncFn: () => Promise<{ ok: boolean; hubspot_id?: string; error?: string }>
): Promise<void> {
  try {
    const result = await syncFn();

    await sql`
      INSERT INTO hubspot_sync_log (entity_type, entity_id, hubspot_id, action, status, error_message, synced_at)
      VALUES (${entityType}, ${entityId}, ${result.hubspot_id || null}, ${action},
              ${result.ok ? 'success' : 'failed'}, ${result.error || null},
              ${result.ok ? new Date().toISOString() : null})
    `;

    // HubSpot-ID am Lead speichern wenn erfolgreich
    if (result.ok && result.hubspot_id && entityType === 'contact') {
      await sql`
        UPDATE leads
        SET hubspot_contact_id = ${result.hubspot_id},
            hubspot_synced_at = NOW()
        WHERE id = ${entityId}
      `;
    }
  } catch (e) {
    console.error(`[hubspot] Sync-Logging Fehler fuer ${entityType}/${entityId}:`, e);
  }
}
