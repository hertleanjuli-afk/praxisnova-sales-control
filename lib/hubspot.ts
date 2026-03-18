const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

interface HubSpotContactProperties {
  email?: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  jobtitle?: string;
  phone?: string;
  hs_lead_status?: string;
  // Custom properties
  icp_type?: string;
  sequence_status?: string;
  sequence_type?: string;
  sequence_step?: string;
  enrolled_at?: string;
  cooldown_until?: string;
  linkedin_export_week?: string;
  [key: string]: string | undefined;
}

export interface HubSpotContact {
  id: string;
  properties: HubSpotContactProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

interface HubSpotSearchResponse {
  total: number;
  results: HubSpotContact[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
}

interface HubSpotError {
  status: string;
  message: string;
  correlationId: string;
  category: string;
}

function getAccessToken(): string {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is not set');
  }
  return token;
}

async function hubspotFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${HUBSPOT_BASE_URL}${path}`;
  const token = getAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({
      message: response.statusText,
    }))) as HubSpotError;
    throw new Error(
      `HubSpot API error (${response.status}): ${error.message || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

export interface CreateContactInput {
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  title?: string;
  icp_type?: string;
  sequence_status?: string;
  sequence_type?: string;
  sequence_step?: number;
  enrolled_at?: string;
  cooldown_until?: string;
  linkedin_export_week?: string;
}

export async function createContact(
  lead: CreateContactInput
): Promise<HubSpotContact> {
  const properties: HubSpotContactProperties = {
    email: lead.email,
    firstname: lead.first_name,
    lastname: lead.last_name,
    company: lead.company,
    jobtitle: lead.title,
    icp_type: lead.icp_type,
    sequence_status: lead.sequence_status,
    sequence_type: lead.sequence_type,
    sequence_step: lead.sequence_step?.toString(),
    enrolled_at: lead.enrolled_at,
    cooldown_until: lead.cooldown_until,
    linkedin_export_week: lead.linkedin_export_week,
  };

  // Remove undefined values
  const cleanProperties = Object.fromEntries(
    Object.entries(properties).filter(([, v]) => v !== undefined)
  );

  return hubspotFetch<HubSpotContact>('/crm/v3/objects/contacts', {
    method: 'POST',
    body: JSON.stringify({ properties: cleanProperties }),
  });
}

export async function updateContact(
  hubspotId: string,
  properties: HubSpotContactProperties
): Promise<HubSpotContact> {
  // Remove undefined values
  const cleanProperties = Object.fromEntries(
    Object.entries(properties).filter(([, v]) => v !== undefined)
  );

  return hubspotFetch<HubSpotContact>(
    `/crm/v3/objects/contacts/${hubspotId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ properties: cleanProperties }),
    }
  );
}

export async function searchContactByEmail(
  email: string
): Promise<HubSpotContact | null> {
  const response = await hubspotFetch<HubSpotSearchResponse>(
    '/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
        properties: [
          'email',
          'firstname',
          'lastname',
          'company',
          'jobtitle',
          'icp_type',
          'sequence_status',
          'sequence_type',
          'sequence_step',
          'enrolled_at',
          'cooldown_until',
          'linkedin_export_week',
        ],
        limit: 1,
      }),
    }
  );

  return response.results[0] ?? null;
}

export async function getRecentContacts(
  days: number = 7
): Promise<HubSpotContact[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceTimestamp = since.toISOString();

  const response = await hubspotFetch<HubSpotSearchResponse>(
    '/crm/v3/objects/contacts/search',
    {
      method: 'POST',
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'createdate',
                operator: 'GTE',
                value: sinceTimestamp,
              },
            ],
          },
        ],
        properties: [
          'email',
          'firstname',
          'lastname',
          'company',
          'jobtitle',
          'icp_type',
          'sequence_status',
          'sequence_type',
          'sequence_step',
          'enrolled_at',
          'cooldown_until',
          'linkedin_export_week',
        ],
        sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
        limit: 100,
      }),
    }
  );

  return response.results;
}
