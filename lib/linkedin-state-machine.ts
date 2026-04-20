/**
 * LinkedIn-State-Machine fuer Track 1 Sales Control V2.
 *
 * Reine Logik-Funktionen, keine DB-Abhaengigkeiten. Konsumenten (Server
 * Actions, API-Routes, Cron-Jobs) fuehren die tatsaechlichen Writes aus und
 * loggen Transitions in linkedin_events. Diese Datei ist die einzige Quelle
 * der Wahrheit fuer erlaubte Uebergaenge.
 *
 * Korrespondiert zum Postgres-Typ `linkedin_state_enum` aus Migration v9.
 * Bei Aenderung hier: Enum in db-migration-v9-linkedin-state-blocks.sql
 * und alle Konsumenten synchron halten.
 */

export const LINKEDIN_STATES = [
  'open',
  'no_linkedin',
  'request_sent',
  'connected',
  'message_sent',
  'replied_positive',
  'replied_negative',
  'blocked_person',
  'blocked_company',
] as const;

export type LinkedInState = (typeof LINKEDIN_STATES)[number];

/**
 * Erlaubte Uebergaenge pro Ausgangs-State.
 * Block-Uebergaenge (person + company) sind aus jedem Non-Block-State moeglich
 * und werden unten separat gemerged, damit die Tabelle hier lesbar bleibt.
 */
const CORE_TRANSITIONS: Record<LinkedInState, LinkedInState[]> = {
  open:             ['request_sent', 'no_linkedin'],
  no_linkedin:      ['open'],
  request_sent:     ['connected', 'no_linkedin'],
  connected:        ['message_sent'],
  message_sent:     ['replied_positive', 'replied_negative'],
  replied_positive: ['message_sent'],
  replied_negative: [],
  blocked_person:   ['open'],
  blocked_company:  ['open'],
};

const NON_BLOCK_STATES: LinkedInState[] = [
  'open',
  'no_linkedin',
  'request_sent',
  'connected',
  'message_sent',
  'replied_positive',
  'replied_negative',
];

/**
 * Merge CORE_TRANSITIONS mit Block-Uebergaengen. Aus jedem Non-Block-State
 * darf per User-Action `blocked_person` oder `blocked_company` erreicht
 * werden. Aus Block-States zurueck auf `open` (Cron-Unblock oder Admin).
 */
export const VALID_TRANSITIONS: Record<LinkedInState, readonly LinkedInState[]> =
  Object.fromEntries(
    LINKEDIN_STATES.map((state) => {
      const core = CORE_TRANSITIONS[state];
      const extras: LinkedInState[] = NON_BLOCK_STATES.includes(state)
        ? ['blocked_person', 'blocked_company']
        : [];
      const merged = Array.from(new Set([...core, ...extras]));
      return [state, merged];
    })
  ) as Record<LinkedInState, readonly LinkedInState[]>;

/**
 * Prueft ob ein Uebergang erlaubt ist. Self-Uebergaenge sind nicht erlaubt,
 * sie haben keine Semantik und koennten Event-Logs aufblaehen.
 */
export function isValidTransition(
  from: LinkedInState,
  to: LinkedInState
): boolean {
  if (from === to) return false;
  const allowed = VALID_TRANSITIONS[from];
  return allowed.includes(to);
}

/**
 * Liefert erlaubte Folgestates fuer einen Ausgangs-State. UI nutzt das, um
 * CTAs zu rendern.
 */
export function nextStates(from: LinkedInState): readonly LinkedInState[] {
  return VALID_TRANSITIONS[from];
}

/**
 * Erzeugt einen Event-Record fuer linkedin_events. Konsument persistiert.
 */
export interface LinkedInTransitionEvent {
  lead_id: number;
  from_state: LinkedInState;
  to_state: LinkedInState;
  triggered_by: string;
}

export function buildTransitionEvent(
  leadId: number,
  from: LinkedInState,
  to: LinkedInState,
  triggeredBy: string
): LinkedInTransitionEvent {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `Invalid LinkedIn state transition: ${from} -> ${to} (lead_id=${leadId})`
    );
  }
  return {
    lead_id: leadId,
    from_state: from,
    to_state: to,
    triggered_by: triggeredBy,
  };
}
