import crypto from 'crypto';

/**
 * Masks the local part of an email address for privacy.
 * Example: "anjuli@example.com" -> "a***i@example.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;

  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }

  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Formats a date in German format: DD.MM.YYYY
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return 'Ungültiges Datum';
  }

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}.${month}.${year}`;
}

/**
 * Returns the ISO week string for a given date.
 * Format: "YYYY-WXX" (e.g., "2026-W12")
 */
export function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

  // Set to nearest Thursday: current date + 4 - current day number (Monday=1, Sunday=7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  // Get first day of the year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Simple className merger. Filters out falsy values and joins with space.
 * Lightweight alternative to clsx + twMerge.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Verifies that a request contains the correct CRON_SECRET header.
 * Used to protect Vercel cron job endpoints.
 *
 * Checks the "Authorization" header for "Bearer {CRON_SECRET}".
 */
export function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[verifyCronSecret] CRON_SECRET environment variable is not set');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');

  // Use timing-safe comparison to prevent timing attacks
  if (token.length !== cronSecret.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(cronSecret)
  );
}

/**
 * Verifies an HMAC-signed token and checks its expiry.
 * Token format: base64({email}:{expiry_timestamp}):signature
 *
 * Returns the decoded payload { email, expiry } if valid, or null if invalid/expired.
 */
export function verifyHmacToken(
  token: string,
  secret: string
): { email: string; expiry: number } | null {
  const separatorIndex = token.lastIndexOf(':');
  if (separatorIndex === -1) {
    return null;
  }

  const payload = token.substring(0, separatorIndex);
  const providedSignature = token.substring(separatorIndex + 1);

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Timing-safe comparison
  if (providedSignature.length !== expectedSignature.length) {
    return null;
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(providedSignature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    return null;
  }

  // Decode payload
  let decoded: string;
  try {
    decoded = Buffer.from(payload, 'base64').toString('utf-8');
  } catch {
    return null;
  }

  const colonIndex = decoded.lastIndexOf(':');
  if (colonIndex === -1) {
    return null;
  }

  const email = decoded.substring(0, colonIndex);
  const expiry = parseInt(decoded.substring(colonIndex + 1), 10);

  if (isNaN(expiry)) {
    return null;
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (now > expiry) {
    return null;
  }

  return { email, expiry };
}
