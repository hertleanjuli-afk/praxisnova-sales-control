/**
 * Fallback-Keywords pro ICP fuer den LinkedIn-Feed-Agent (Track 1, T1.3).
 *
 * Primaer liest der Agent icp_config.linkedin_keywords (JSONB) aus der DB.
 * Wenn die Tabelle keine Zeilen fuer einen ICP hat (z.B. vor Track-3-Seeds),
 * greift dieser Fallback. So ist T1.3 lauffaehig ohne auf Track 3 zu warten.
 *
 * Keywords sind bewusst Deutsch + Englisch gemischt und werden case-insensitiv
 * gematcht (lib/linkedin-feed/score.ts). Bitte NICHT UWG-riskante oder
 * legal-sensitive Begriffe aufnehmen (kein Foerder-, AZAV-, DSGVO-Wording).
 *
 * Bei Aenderungen parallel icp_config.linkedin_keywords updaten, damit
 * Fallback und DB synchron sind.
 */

export interface IcpKeywordDefault {
  id: string;
  displayName: string;
  keywords: string[];
}

export const ICP_LINKEDIN_KEYWORDS_FALLBACK: IcpKeywordDefault[] = [
  {
    id: 'icp-proptech',
    displayName: 'PropTech + Immobilien',
    keywords: [
      'proptech',
      'immobilien tech',
      'immobilien software',
      'mieterverwaltung',
      'digitale hausverwaltung',
      'mietsoftware',
      'real estate tech',
      'property management software',
    ],
  },
  {
    id: 'icp-hausverwaltung',
    displayName: 'Hausverwaltung',
    keywords: [
      'hausverwaltung',
      'wohnungseigentumsverwaltung',
      'weg-verwaltung',
      'mietverwaltung',
      'sondereigentumsverwaltung',
      'verwalterbeirat',
    ],
  },
  {
    id: 'icp-kanzlei',
    displayName: 'Steuerberater + Anwaelte',
    keywords: [
      'steuerberater',
      'steuerkanzlei',
      'rechtsanwalt',
      'rechtsanwaltskanzlei',
      'notar',
      'wirtschaftspruefer',
      'kanzleisoftware',
      'legal tech',
    ],
  },
  {
    id: 'icp-agentur',
    displayName: 'Digitale Agenturen',
    keywords: [
      'digitalagentur',
      'marketingagentur',
      'webagentur',
      'kreativagentur',
      'werbeagentur',
      'performance marketing',
      'agentur skalieren',
    ],
  },
];

export function findFallbackKeywords(icpId: string): string[] {
  const entry = ICP_LINKEDIN_KEYWORDS_FALLBACK.find((i) => i.id === icpId);
  return entry ? entry.keywords : [];
}
