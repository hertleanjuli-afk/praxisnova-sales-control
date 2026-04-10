/**
 * Email template utilities.
 *
 * Purpose: guarantee that every internal email sent to Angie is readable,
 * regardless of how the LLM agents hand-roll their HTML.
 *
 * Problem this solves:
 *  - Operations-Manager, Weekly-Report, Monthly-Report, etc. are LLM agents
 *    that generate HTML email bodies on the fly. They frequently set dark
 *    text colors on our dark brand background, producing unreadable emails.
 *  - This module post-processes any LLM-generated HTML and rewrites dark
 *    text colors to bright ones, wraps the content in a dark shell with
 *    forced readable defaults, and strips em/en dashes per brand rule.
 *
 * Usage:
 *   import { wrapInternalEmail } from '@/lib/email-template';
 *   const safeHtml = wrapInternalEmail(rawLlmHtml, 'Morgen-Briefing');
 *   // then send safeHtml via Brevo
 */

export const EMAIL_COLORS = {
  bg: '#0A0A0A',
  cardBg: '#1A1A1A',
  cardBgAlt: '#141414',
  border: '#2A2A2A',
  textPrimary: '#FFFFFF',
  textSecondary: '#F0F0F5',
  textMuted: '#B5B5C0',
  accent: '#E8472A',
  accentDim: '#B83A21',
  success: '#4ADE80',
  warning: '#FACC15',
  danger: '#F87171',
} as const;

/**
 * Relative luminance of a color string.
 * Supports #rgb, #rrggbb, rgb(r,g,b), rgba(r,g,b,a).
 * Returns 0 (black) to 1 (white). Unknown formats return 1 (treated as bright).
 */
function luminance(color: string): number {
  const c = color.trim().toLowerCase();

  // Named colors that are clearly dark
  if (c === 'black') return 0;
  if (c === 'white') return 1;

  const hex = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    const r = parseInt(rgb[1], 10);
    const g = parseInt(rgb[2], 10);
    const b = parseInt(rgb[3], 10);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  return 1;
}

/**
 * Rewrite every `color: X` declaration in the given HTML whose luminance is
 * below `threshold` to a bright fallback. Leaves bright colors untouched.
 * Operates on inline `style="..."` attributes and embedded `<style>` blocks.
 */
function rewriteDarkColors(html: string, threshold = 0.55, fallback = EMAIL_COLORS.textPrimary): string {
  // Match "color: <value>" where value is #hex or rgb(...)
  return html.replace(
    /color\s*:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))/g,
    (match, color) => {
      try {
        const lum = luminance(color);
        if (lum < threshold) return `color: ${fallback}`;
        return match;
      } catch {
        return match;
      }
    },
  );
}

/**
 * Rewrite dark background colors on elements that also contain text.
 * Very conservative: only rewrites backgrounds lighter than pure black but
 * darker than our card color, so #1a1a1a -> #1a1a1a (unchanged),
 * #0f0f0f -> #1a1a1a (brightened slightly for contrast with bg).
 *
 * This is skipped by default because most LLM templates pick the bg correctly,
 * the readability issue is almost always with `color:` not `background:`.
 */
function rewriteDarkBackgrounds(html: string): string {
  return html; // no-op for now, kept as hook
}

/**
 * Strip em-dash and en-dash per PraxisNova brand rule.
 */
function stripDashes(s: string): string {
  return s.replace(/[\u2013\u2014]/g, '-');
}

/**
 * Wrap any LLM-generated internal email HTML with a dark shell that
 * guarantees readable contrast.
 *
 *  1. Strips em/en dashes (brand rule)
 *  2. Rewrites any dark `color:` values to white
 *  3. Extracts just the body content if a full <html> doc was passed
 *  4. Wraps in a safe shell with <style> forcing body + children to readable colors
 *  5. Adds a standard footer with dashboard link
 */
export function wrapInternalEmail(rawHtml: string, title = 'PraxisNova AI'): string {
  let inner = rawHtml || '';

  // Step 1: strip dashes
  inner = stripDashes(inner);

  // Step 2: rewrite dark colors
  inner = rewriteDarkColors(inner);
  inner = rewriteDarkBackgrounds(inner);

  // Step 3: if already a full document, keep only the body content
  const bodyMatch = inner.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    inner = bodyMatch[1];
  }
  inner = inner.replace(/<\/?html[^>]*>/gi, '');
  inner = inner.replace(/<head[\s\S]*?<\/head>/gi, '');
  inner = inner.replace(/<!DOCTYPE[^>]*>/gi, '');

  const safeTitle = stripDashes(title).replace(/</g, '&lt;');

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle}</title>
<style>
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: ${EMAIL_COLORS.bg} !important;
    color: ${EMAIL_COLORS.textPrimary} !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif !important;
    -webkit-font-smoothing: antialiased;
    line-height: 1.55;
  }
  body, body p, body div, body span, body td, body th, body li, body dd, body dt, body label {
    color: ${EMAIL_COLORS.textPrimary};
  }
  body h1, body h2, body h3, body h4, body h5, body h6, body strong, body b {
    color: ${EMAIL_COLORS.textPrimary} !important;
  }
  body a { color: ${EMAIL_COLORS.accent}; text-decoration: underline; }
  body small, body .muted, body [class*="muted"] { color: ${EMAIL_COLORS.textMuted} !important; }
  body .pn-card, body [class*="card"] {
    background: ${EMAIL_COLORS.cardBg};
    border: 1px solid ${EMAIL_COLORS.border};
    border-radius: 8px;
    padding: 16px;
  }
  body .pn-accent { color: ${EMAIL_COLORS.accent} !important; }
  body .pn-success { color: ${EMAIL_COLORS.success} !important; }
  body .pn-warning { color: ${EMAIL_COLORS.warning} !important; }
  body .pn-danger { color: ${EMAIL_COLORS.danger} !important; }
</style>
</head>
<body style="background:${EMAIL_COLORS.bg};color:${EMAIL_COLORS.textPrimary};margin:0;padding:0;">
<div style="max-width:640px;margin:0 auto;padding:24px;background:${EMAIL_COLORS.bg};color:${EMAIL_COLORS.textPrimary};">
${inner}
<div style="margin-top:32px;padding-top:16px;border-top:1px solid ${EMAIL_COLORS.border};color:${EMAIL_COLORS.textMuted};font-size:12px;text-align:center;">
PraxisNova AI Sales Control Center &middot; <a href="https://praxisnova-sales-control.vercel.app/agents" style="color:${EMAIL_COLORS.accent};">Dashboard oeffnen</a>
</div>
</div>
</body>
</html>`;
}

/**
 * Render a KPI row with traffic-light style. Small helper for reports that
 * want structured rendering without trusting the LLM.
 */
export function renderKpiRow(label: string, current: number, target: number): string {
  const pct = target > 0 ? current / target : 0;
  const status: 'green' | 'yellow' | 'red' =
    pct >= 0.9 ? 'green' : pct >= 0.5 ? 'yellow' : 'red';
  const color = status === 'green' ? EMAIL_COLORS.success : status === 'yellow' ? EMAIL_COLORS.warning : EMAIL_COLORS.danger;
  const barWidth = Math.min(100, Math.round(pct * 100));
  return `
<div style="margin:12px 0;padding:12px 16px;background:${EMAIL_COLORS.cardBg};border:1px solid ${EMAIL_COLORS.border};border-radius:8px;color:${EMAIL_COLORS.textPrimary};">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
    <span style="color:${EMAIL_COLORS.textPrimary};font-weight:600;">${label}</span>
    <span style="color:${color};font-weight:700;">${current} / ${target}</span>
  </div>
  <div style="background:${EMAIL_COLORS.border};border-radius:4px;height:6px;overflow:hidden;">
    <div style="background:${color};width:${barWidth}%;height:100%;"></div>
  </div>
</div>`;
}
