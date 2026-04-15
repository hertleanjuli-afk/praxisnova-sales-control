// Apollo People Search endpoint.
// URL-History (Apollo aendert den Pfad ~1x pro Monat, siehe LECK-14):
//   2024 frueh:  /v1/mixed_people/api_search
//   2025 Q4:     /v1/mixed_people/search
//   2026-04 Q1:  /api/v1/mixed_people/search
//   2026-04-11:  /api/v1/mixed_people/api_search  <-- aktuell, verifiziert in apollo-sync cron (ff4a2b2)
// Wenn Apollo 422 liefert mit "deprecated endpoint" Hinweis: Error-Text prueft den
// neuen Pfad. Response-Shape: data.people | data.contacts (Apollo toggled).
const APOLLO_API_URL = 'https://api.apollo.io/api/v1/mixed_people/api_search';
export interface ApolloLead {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  title: string | null;
  linkedin_url: string | null;
  organization: {
    id: string;
    name: string | null;
    industry: string | null;
    estimated_num_employees: number | null;
    website_url: string | null;
    primary_domain: string | null;
  } | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface ApolloSearchResponse {
  people: ApolloLead[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

interface ICPFilter {
  person_titles: string[];
  q_organization_keyword_tags: string[];
}

const ICP_FILTERS: Record<string, ICPFilter> = {
  immobilien: {
    person_titles: [
      'Geschäftsführer',
      'Inhaber',
      'Managing Director',
      'CEO',
    ],
    q_organization_keyword_tags: [
      'real estate',
      'immobilien',
      'immobilienmakler',
      'property management',
      'hausverwaltung',
      'real estate agency',
      'immobilienverwaltung',
    ],
  },
  handwerk: {
    person_titles: [
      'Meister',
      'Geschäftsführer',
      'Inhaber',
    ],
    q_organization_keyword_tags: [
      'trades',
      'handwerk',
      'craftsmen',
      'elektrik',
      'sanitär',
      'heizung',
      'malerei',
      'tischlerei',
      'dachdecker',
      'klempner',
      'schreiner',
    ],
  },
  bauunternehmen: {
    person_titles: [
      'Geschäftsführer',
      'Bauleiter',
      'Inhaber',
      'CEO',
    ],
    q_organization_keyword_tags: [
      'construction',
      'bau',
      'bauunternehmen',
      'building',
      'general contractor',
      'hochbau',
      'tiefbau',
      'bauträger',
    ],
  },
};

export async function searchLeads(
  sector: string,
  state?: string,
  limit: number = 25
): Promise<ApolloLead[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    throw new Error('APOLLO_API_KEY environment variable is not set');
  }

  const normalizedSector = sector.toLowerCase().trim();
  const icpFilter = ICP_FILTERS[normalizedSector];
  if (!icpFilter) {
    throw new Error(
      `Unknown sector "${sector}". Valid sectors: ${Object.keys(ICP_FILTERS).join(', ')}`
    );
  }

  const personLocations: string[] = state
    ? [`${state}, Germany`]
    : ['Germany'];

  const body: Record<string, unknown> = {
    person_titles: icpFilter.person_titles,
    q_organization_keyword_tags: icpFilter.q_organization_keyword_tags,
    person_locations: personLocations,
    organization_num_employees_ranges: ['1,100'],
    page: 1,
    per_page: Math.min(limit, 100),
    // Only return people with email addresses
    contact_email_status: ['verified', 'guessed', 'unavailable'],
  };

  const response = await fetch(APOLLO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // Full error logging - Apollo 422 zeigt den neuen Endpoint-Pfad im Body.
    const errorText = await response.text();
    console.error(`[apollo] Full Apollo error response (${response.status}):`, errorText);
    throw new Error(
      `Apollo API Fehler (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as ApolloSearchResponse & { contacts?: ApolloLead[] };

  // Apollo toggled zwischen `people` und `contacts` Root-Keys. Beide pruefen.
  const people = data.people ?? data.contacts ?? [];
  if (people.length === 0 && data && typeof data === 'object') {
    console.log('[apollo] Empty result, response root keys:', Object.keys(data));
  }

  // Filter out leads without email addresses. Wichtig: api_search liefert laut
  // Apollo-Docs keine Emails mehr; Konsumer muss Enrichment-Endpoint separat
  // aufrufen. Lib hier gibt aber nur zurueck was Apollo liefert, Caller
  // entscheidet was mit email=null geschieht (siehe apollo-sync Route fuer
  // Placeholder-Muster).
  return people.filter(
    (person) => person.email !== null && person.email !== ''
  );
}

export function getAvailableSectors(): string[] {
  return Object.keys(ICP_FILTERS);
}

export function getICPFilter(sector: string): ICPFilter | undefined {
  return ICP_FILTERS[sector.toLowerCase().trim()];
}
