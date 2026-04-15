interface Section {
  heading: string;
  body: string;
  bullets?: string[];
}

interface EmailOpts {
  title: string;
  sections: Section[];
  ctaButton?: { text: string; url: string };
  footerText?: string;
}

const PRIMARY = '#1a3a6c';
const ACCENT = '#e8b547';
const TEXT = '#1f2937';
const MUTED = '#6b7280';
const BG = '#f8fafc';

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSection(s: Section): string {
  const bullets = s.bullets && s.bullets.length > 0
    ? `<ul style="margin:8px 0 0 0;padding-left:20px;color:${TEXT};">${s.bullets
        .map((b) => `<li style="margin:4px 0;">${escape(b)}</li>`)
        .join('')}</ul>`
    : '';
  return `
    <tr><td style="padding:16px 24px;">
      <h2 style="margin:0 0 8px 0;font-size:16px;color:${PRIMARY};font-family:Helvetica,Arial,sans-serif;">${escape(s.heading)}</h2>
      <div style="font-size:14px;line-height:1.5;color:${TEXT};font-family:Helvetica,Arial,sans-serif;">${s.body}</div>
      ${bullets}
    </td></tr>`;
}

function renderCta(cta?: EmailOpts['ctaButton']): string {
  if (!cta) return '';
  return `
    <tr><td style="padding:8px 24px 24px 24px;">
      <a href="${escape(cta.url)}" style="display:inline-block;background:${PRIMARY};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;">${escape(cta.text)}</a>
    </td></tr>`;
}

export function buildEmail(opts: EmailOpts): string {
  const footer = opts.footerText ?? 'PraxisNova AI - automatisiert erstellt';
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escape(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;border:1px solid #e5e7eb;">
      <tr><td style="padding:24px 24px 8px 24px;border-bottom:3px solid ${ACCENT};">
        <h1 style="margin:0;font-size:20px;color:${PRIMARY};font-family:Helvetica,Arial,sans-serif;">${escape(opts.title)}</h1>
      </td></tr>
      ${opts.sections.map(renderSection).join('')}
      ${renderCta(opts.ctaButton)}
      <tr><td style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:${MUTED};font-family:Helvetica,Arial,sans-serif;">${escape(footer)}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
