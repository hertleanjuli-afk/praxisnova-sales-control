import { logger } from './logger';

interface SendOpts {
  to: string | string[];
  subject: string;
  htmlBody: string;
  from?: string;
  replyTo?: string;
  tags?: string[];
}

interface SendResult {
  messageId: string;
}

const DEFAULT_FROM = process.env.BREVO_DEFAULT_FROM ?? 'info@praxisnovaai.com';
const RATE_LIMIT_PER_MINUTE = 10;

const recentSends: number[] = [];

function checkRateLimit(): void {
  const now = Date.now();
  const windowStart = now - 60_000;
  while (recentSends.length > 0 && recentSends[0] < windowStart) recentSends.shift();
  if (recentSends.length >= RATE_LIMIT_PER_MINUTE) {
    throw new Error(`brevo rate limit: ${RATE_LIMIT_PER_MINUTE}/min exceeded`);
  }
  recentSends.push(now);
}

export async function sendEmail(opts: SendOpts): Promise<SendResult> {
  if (process.env.MOCK_BREVO === 'true') {
    logger.info('brevo mock send', {
      to: opts.to,
      subject: opts.subject,
      tags: opts.tags,
    });
    return { messageId: `mock-${Date.now()}` };
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not set');

  checkRateLimit();

  const recipients = Array.isArray(opts.to) ? opts.to : [opts.to];
  const from = opts.from ?? DEFAULT_FROM;

  const body = {
    sender: { email: from },
    to: recipients.map((email) => ({ email })),
    subject: opts.subject,
    htmlContent: opts.htmlBody,
    ...(opts.replyTo ? { replyTo: { email: opts.replyTo } } : {}),
    ...(opts.tags && opts.tags.length > 0 ? { tags: opts.tags } : {}),
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`brevo ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = (await res.json()) as { messageId?: string };
  return { messageId: json.messageId ?? 'unknown' };
}
