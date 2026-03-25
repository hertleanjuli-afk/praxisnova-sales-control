import crypto from 'crypto';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface SendEmailInput {
  to: string;
  subject: string;
  htmlContent: string;
  tags?: string[];
  senderEmail?: string;
  senderName?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId: string | null;
  senderUsed: string | null;
  error?: string;
}

interface BrevoSuccessResponse {
  messageId: string;
}

interface BrevoErrorResponse {
  code: string;
  message: string;
}

function getApiKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    throw new Error('BREVO_API_KEY environment variable is not set');
  }
  return key;
}

function getHmacSecret(): string {
  const secret = process.env.BREVO_WEBHOOK_SECRET || process.env.INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('BREVO_WEBHOOK_SECRET environment variable is not set');
  }
  return secret;
}

function buildDsgvoFooter(unsubscribeLink: string): string {
  return `
<br/>
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0"/>
<p style="font-size:11px;color:#999;line-height:1.5;">
  PraxisNova AI | Otto-Hahn-Str., 72622 N&uuml;rtingen | info@praxisnovaai.com<br/>
  Sie erhalten diese E-Mail da Ihre Gesch&auml;ftsadresse &ouml;ffentlich zug&auml;nglich ist (UWG &sect;7).<br/>
  Wenn Sie keine weiteren E-Mails w&uuml;nschen: <a href="${unsubscribeLink}">Abmelden</a>
</p>`;
}

async function sendViaBrevo(
  senderEmail: string,
  senderName: string,
  to: string,
  subject: string,
  htmlContent: string,
  tags?: string[]
): Promise<{ ok: boolean; status: number; data: BrevoSuccessResponse | BrevoErrorResponse }> {
  const apiKey = getApiKey();

  const body: Record<string, unknown> = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject,
    htmlContent,
  };

  if (tags && tags.length > 0) {
    body.tags = tags;
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data: data as BrevoSuccessResponse | BrevoErrorResponse,
  };
}

function isSenderError(status: number, data: BrevoSuccessResponse | BrevoErrorResponse): boolean {
  if (status !== 400) return false;
  const errorData = data as BrevoErrorResponse;
  return (
    errorData.message?.toLowerCase().includes('sender') ||
    errorData.code?.toLowerCase().includes('sender') ||
    false
  );
}

export async function sendTransactionalEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const { to, subject, htmlContent, tags } = input;

  const primarySender = input.senderEmail || process.env.BREVO_SENDER_EMAIL_PRIMARY || 'info@praxisnovaai.com';
  const fallbackSender = process.env.BREVO_SENDER_EMAIL_FALLBACK;
  const senderName = input.senderName || process.env.BREVO_SENDER_NAME || 'Anjuli Hertle';

  // Generate unsubscribe link and append DSGVO footer
  const unsubscribeLink = generateUnsubscribeLink(to);
  const fullHtml = htmlContent + buildDsgvoFooter(unsubscribeLink);

  // Attempt 1: Primary sender
  console.log(`[Brevo] Sending email to ${to} via primary sender: ${primarySender}`);
  const primaryResult = await sendViaBrevo(
    primarySender,
    senderName,
    to,
    subject,
    fullHtml,
    tags
  );

  if (primaryResult.ok) {
    const successData = primaryResult.data as BrevoSuccessResponse;
    console.log(`[Brevo] Email sent successfully via ${primarySender}, messageId: ${successData.messageId}`);
    return {
      success: true,
      messageId: successData.messageId,
      senderUsed: primarySender,
    };
  }

  // Attempt 2: Fallback sender if primary failed with sender error
  if (fallbackSender && isSenderError(primaryResult.status, primaryResult.data)) {
    console.warn(
      `[Brevo] Primary sender failed with sender error. Retrying with fallback: ${fallbackSender}`
    );

    const fallbackResult = await sendViaBrevo(
      fallbackSender,
      senderName,
      to,
      subject,
      fullHtml,
      tags
    );

    if (fallbackResult.ok) {
      const successData = fallbackResult.data as BrevoSuccessResponse;
      console.log(`[Brevo] Email sent successfully via fallback ${fallbackSender}, messageId: ${successData.messageId}`);
      return {
        success: true,
        messageId: successData.messageId,
        senderUsed: fallbackSender,
      };
    }

    const fallbackError = fallbackResult.data as BrevoErrorResponse;
    console.error(`[Brevo] Fallback sender also failed: ${fallbackError.message}`);
    return {
      success: false,
      messageId: null,
      senderUsed: fallbackSender,
      error: `Fallback sender failed: ${fallbackError.message}`,
    };
  }

  // Primary failed with non-sender error (or no fallback configured)
  const errorData = primaryResult.data as BrevoErrorResponse;
  console.error(`[Brevo] Email sending failed: ${errorData.message}`);
  return {
    success: false,
    messageId: null,
    senderUsed: primarySender,
    error: errorData.message,
  };
}

/**
 * Generate an HMAC-signed unsubscribe link.
 * Token format: base64({email}:{expiry_timestamp}):signature
 * Default expiry: 365 days from now.
 */
export function generateUnsubscribeLink(email: string, expiryDays: number = 365): string {
  const secret = getHmacSecret();
  const expiry = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;
  const payload = Buffer.from(`${email}:${expiry}`).toString('base64');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const token = `${payload}:${signature}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.praxisnovaai.com';

  return `${baseUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * Generate an HMAC-signed double opt-in confirmation link.
 * Token format: base64({email}:{expiry_timestamp}):signature
 * Default expiry: 7 days from now.
 */
export function generateConfirmLink(email: string, expiryDays: number = 7): string {
  const secret = getHmacSecret();
  const expiry = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;
  const payload = Buffer.from(`${email}:${expiry}`).toString('base64');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const token = `${payload}:${signature}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.praxisnovaai.com';

  return `${baseUrl}/api/confirm-optin?token=${encodeURIComponent(token)}`;
}
