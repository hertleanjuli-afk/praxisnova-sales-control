/**
 * Simple keyword-based reply sentiment classifier.
 * Classifies inbound replies as positive / negative / neutral.
 *
 * Positive  → Lead shows interest, asks questions, wants a call
 * Negative  → Lead declines, asks to stop, is annoyed
 * Neutral   → Auto-replies, out-of-office, unclear intent
 */

const POSITIVE_PATTERNS = [
  // German positive signals
  /\binteresse\b/i,
  /\binteressiert\b/i,
  /\btermin\b/i,
  /\bgespräch\b/i,
  /\bja\s*(,|!|\.|\b)/i,
  /\bgerne\b/i,
  /\bklingt\s+gut\b/i,
  /\bklingt\s+interessant\b/i,
  /\bkönnen\s+wir\b/i,
  /\blass\s+uns\b/i,
  /\blassen\s+sie\s+uns\b/i,
  /\brufen\s+sie\b.*\ban\b/i,
  /\bwann\s+passt\b/i,
  /\bwann\s+hätten\b/i,
  /\bweiter(e|n)?\s+informationen?\b/i,
  /\bmehr\s+(erfahren|wissen|infos?)\b/i,
  /\bbuchen\b/i,
  /\bfreue\s+mich\b/i,
  /\bkontakt\s*aufnehm/i,
  /\bzurück\s*ruf/i,
  // English positive signals (some leads reply in English)
  /\binterested\b/i,
  /\bschedule\b/i,
  /\blet['']?s\s+talk\b/i,
  /\bsounds?\s+good\b/i,
  /\btell\s+me\s+more\b/i,
];

const NEGATIVE_PATTERNS = [
  // German negative signals
  /\bkein\s+interesse\b/i,
  /\bnicht\s+interessiert\b/i,
  /\bbitte\s+nicht\s+mehr\b/i,
  /\bkeine\s+(weitere|e-?mails?|nachrichten)\b/i,
  /\bstop\b/i,
  /\babmelden\b/i,
  /\babbestellen\b/i,
  /\bentfernen\s+sie\b/i,
  /\blöschen\s+sie\b/i,
  /\bnein\s*(,|\.|!|\b)/i,
  /\bunerwünscht/i,
  /\bspam\b/i,
  /\bbelästig/i,
  /\bunterlassen\b/i,
  /\brechtliche\s+schritte\b/i,
  /\banwalt\b/i,
  /\bdsgvo\b/i,
  /\bdatenschutz\b/i,
  /\bwiderspruch\b/i,
  // English negative signals
  /\bnot\s+interested\b/i,
  /\bunsubscribe\b/i,
  /\bremove\s+me\b/i,
  /\bstop\s+(emailing|contacting)\b/i,
];

const NEUTRAL_PATTERNS = [
  /\babwesen(d|heit)/i,
  /\bout\s+of\s+office\b/i,
  /\bauto(matische)?[-\s]?(antwort|reply)\b/i,
  /\bnicht\s+im\s+(büro|haus|office)\b/i,
  /\burlaub\b/i,
  /\bzurück\s+am\b/i,
  /\bi['']?m\s+out\b/i,
  /\bcurrently\s+(unavailable|away)\b/i,
  /\bmailer[-\s]?daemon\b/i,
  /\bdelivery\s+(failed|failure)\b/i,
];

export type Sentiment = 'positive' | 'negative' | 'neutral';

export function classifyReply(text: string): { sentiment: Sentiment; confidence: number; matchedPattern: string | null } {
  if (!text || text.trim().length === 0) {
    return { sentiment: 'neutral', confidence: 0.5, matchedPattern: null };
  }

  // Check neutral (auto-reply) first – these override everything
  for (const pattern of NEUTRAL_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { sentiment: 'neutral', confidence: 0.9, matchedPattern: match[0] };
    }
  }

  let positiveScore = 0;
  let negativeScore = 0;
  let lastPositiveMatch = '';
  let lastNegativeMatch = '';

  for (const pattern of POSITIVE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      positiveScore++;
      lastPositiveMatch = match[0];
    }
  }

  for (const pattern of NEGATIVE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      negativeScore++;
      lastNegativeMatch = match[0];
    }
  }

  if (positiveScore > 0 && positiveScore > negativeScore) {
    const confidence = Math.min(0.95, 0.6 + positiveScore * 0.1);
    return { sentiment: 'positive', confidence, matchedPattern: lastPositiveMatch };
  }

  if (negativeScore > 0 && negativeScore >= positiveScore) {
    const confidence = Math.min(0.95, 0.6 + negativeScore * 0.1);
    return { sentiment: 'negative', confidence, matchedPattern: lastNegativeMatch };
  }

  // No clear signal
  return { sentiment: 'neutral', confidence: 0.4, matchedPattern: null };
}
