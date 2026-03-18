// Apollo People Search — tries /v1/mixed_people/search first, falls back to /v1/people/search
const APOLLO_API_URLS = [
  'https://api.apollo.io/v1/mixed_people/search',
  'https://api.apollo.io/v1/people/search',
];

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

  let data: ApolloSearchResponse | null = null;
  let lastError = '';

  for (const url of APOLLO_API_URLS) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      data = (await response.json()) as ApolloSearchResponse;
      break;
    }

    lastError = await response.text();
    // If 403, try next endpoint
    if (response.status === 403) {
      console.warn(`Apollo endpoint ${url} returned 403, trying next...`);
      continue;
    }

    // For other errors, throw immediately
    throw new Error(`Apollo API error (${response.status}): ${lastError}`);
  }

  if (!data) {
    throw new Error(
      `Apollo API: Alle Endpoints gaben 403 zurück. Bitte prüfen Sie Ihren Apollo-Plan (Basic oder höher erforderlich). Details: ${lastError}`
    );
  }

  // Filter out leads without email addresses
  return data.people.filter(
    (person) => person.email !== null && person.email !== ''
  );
}

export function getAvailableSectors(): string[] {
  return Object.keys(ICP_FILTERS);
}

export function getICPFilter(sector: string): ICPFilter | undefined {
  return ICP_FILTERS[sector.toLowerCase().trim()];
}
