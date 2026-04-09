/**
 * HubSpot Custom Properties Setup
 *
 * POST /api/hubspot/setup-properties
 * Headers: x-agent-secret: <CRON_SECRET>
 *
 * Creates 4 custom contact properties in HubSpot:
 * 1. praxisnova_lead_id - PraxisNova Lead ID (number)
 * 2. agent_score - AI Agent Bewertung 1-10 (number)
 * 3. lead_category - Lead Kategorie with enumeration (string)
 * 4. outreach_step - Outreach Step with enumeration (string)
 *
 * Handles 409 (already exists) gracefully and returns summary.
 */

import { NextRequest, NextResponse } from 'next/server';

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY || '';
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

interface PropertyDefinition {
  name: string;
  label: string;
  description?: string;
  type: 'number' | 'string';
  fieldType?: 'number' | 'text' | 'enumeration';
  groupName: string;
  options?: Array<{ label: string; value: string }>;
}

interface CreatePropertyResult {
  ok: boolean;
  name: string;
  created: boolean;
  skipped: boolean;
  error?: string;
}

const PROPERTIES_TO_CREATE: PropertyDefinition[] = [
  {
    name: 'praxisnova_lead_id',
    label: 'PraxisNova Lead ID',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
  },
  {
    name: 'agent_score',
    label: 'Agent Score',
    description: 'AI Agent Bewertung 1-10',
    type: 'number',
    fieldType: 'number',
    groupName: 'contactinformation',
  },
  {
    name: 'lead_category',
    label: 'Lead Kategorie',
    type: 'string',
    fieldType: 'enumeration',
    groupName: 'contactinformation',
    options: [
      { label: 'Immobilien', value: 'immobilien' },
      { label: 'Bauunternehmen', value: 'bauunternehmen' },
      { label: 'Handwerk', value: 'handwerk' },
      { label: 'Allgemein', value: 'allgemein' },
    ],
  },
  {
    name: 'outreach_step',
    label: 'Outreach Step',
    type: 'string',
    fieldType: 'enumeration',
    groupName: 'contactinformation',
    options: [
      { label: 'New', value: 'new' },
      { label: 'Step 1', value: 'step1' },
      { label: 'Step 2', value: 'step2' },
      { label: 'Step 3', value: 'step3' },
      { label: 'Nurture', value: 'nurture' },
      { label: 'Blocked', value: 'blocked' },
    ],
  },
];

export async function POST(req: NextRequest) {
  // Check authorization
  const secret = req.headers.get('x-agent-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate HubSpot API key
  if (!HUBSPOT_API_KEY) {
    return NextResponse.json(
      { error: 'HUBSPOT_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const results: CreatePropertyResult[] = [];

    for (const prop of PROPERTIES_TO_CREATE) {
      const result = await createProperty(prop);
      results.push(result);
    }

    // Summary
    const created = results.filter(r => r.created).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.created && !r.skipped).length;

    return NextResponse.json({
      ok: true,
      summary: {
        total: results.length,
        created,
        skipped,
        failed,
      },
      details: results,
    });
  } catch (error) {
    console.error('[hubspot-setup-properties] Error:', error);
    return NextResponse.json(
      { error: String(error), ok: false },
      { status: 500 }
    );
  }
}

async function createProperty(
  prop: PropertyDefinition
): Promise<CreatePropertyResult> {
  try {
    const requestBody = buildPropertyPayload(prop);

    const response = await fetch(
      `${HUBSPOT_BASE_URL}/crm/v3/properties/contacts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Property already exists (409) - skip gracefully
    if (response.status === 409) {
      console.log(`[hubspot] Property ${prop.name} already exists, skipping`);
      return {
        ok: true,
        name: prop.name,
        created: false,
        skipped: true,
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[hubspot] Failed to create property ${prop.name}: ${response.status}`,
        errorText
      );
      return {
        ok: false,
        name: prop.name,
        created: false,
        skipped: false,
        error: `${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    console.log(`[hubspot] Property ${prop.name} created successfully`);

    return {
      ok: true,
      name: prop.name,
      created: true,
      skipped: false,
    };
  } catch (error) {
    console.error(`[hubspot] Error creating property ${prop.name}:`, error);
    return {
      ok: false,
      name: prop.name,
      created: false,
      skipped: false,
      error: String(error),
    };
  }
}

function buildPropertyPayload(prop: PropertyDefinition): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: prop.name,
    label: prop.label,
    type: prop.type,
    fieldType: prop.fieldType,
    groupName: prop.groupName,
    hasUniqueValue: false,
    hidden: false,
  };

  // Add description if provided
  if (prop.description) {
    payload.description = prop.description;
  }

  // Add options for enumeration fields
  if (prop.fieldType === 'enumeration' && prop.options) {
    payload.options = prop.options;
  }

  return payload;
}
