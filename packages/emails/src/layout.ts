/**
 * The one email layout, from the design tokens and the brand rules (AGENTS.md):
 * black header with the wordmark, white content, black footer; one yellow pill
 * button; 24px radius on the summary box; green only for success, red only for
 * errors; no kickers, dividers or gradients; no em dashes.
 *
 * Templates do not write HTML. They return blocks, and this file renders them
 * to HTML (escaped here, in one place) and to plain text.
 */
import { colors, font, radii } from '@zurichjs/design/tokens';

export const SITE_ORIGIN = 'https://zurichjs.com';

/** Bylaws Art. 1. */
export const ASSOCIATION = { name: 'Swiss JavaScript Group', address: 'Alderstrasse 30, 8008 Zurich', email: 'hello@zurichjs.com' } as const;

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'button'; label: string; url: string }
  /** Label and value rows in a grey box (level, fee, dates). */
  | { kind: 'summary'; rows: [string, string][] }
  /** A link written out in full, for when the button does not work. */
  | { kind: 'url'; text: string; url: string }
  | { kind: 'small'; text: string }
  | { kind: 'success'; text: string }
  /** A status pill in the success colours ("Your membership is active"). */
  | { kind: 'badge'; text: string }
  /**
   * A plan at a glance, in a grey card: the level as its title, the price large
   * ("CHF 250" with "a year" beside it), then label and value rows.
   */
  | { kind: 'plan'; title: string; price: string; per: string; rows: [string, string][] }
  | { kind: 'error'; text: string };

export interface EmailContent {
  subject: string;
  /** The line inbox lists show after the subject. */
  preheader: string;
  heading: string;
  blocks: Block[];
  /** Replaces the footer line (emails to the board say where replies go). */
  footer?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]!);

/** Only https links (or the site's own), so a template can never put a javascript: URL in a button. */
export function safeUrl(url: string): string {
  const u = new URL(url);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'))) throw new Error(`Email links must be https: ${url}`);
  return u.toString();
}

const FONT_STACK = `${font.family}, ${['Helvetica', 'Arial', ...font.fallbacks].join(', ')}`;
const text = `font-family:${FONT_STACK};font-size:17px;line-height:1.55;color:${colors.black};`;

function blockHtml(b: Block): string {
  switch (b.kind) {
    case 'p':
      return `<p style="margin:0 0 18px;${text}">${escapeHtml(b.text)}</p>`;
    case 'small':
      return `<p style="margin:0 0 14px;${text}font-size:15px;color:${colors['grey-text']};">${escapeHtml(b.text)}</p>`;
    case 'success':
      return `<p style="margin:0 0 18px;padding:14px 18px;border-radius:${radii.card};background:${colors['success-soft']};${text}color:${colors.success};font-weight:700;">${escapeHtml(b.text)}</p>`;
    case 'badge':
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td bgcolor="${colors['success-soft']}" style="border-radius:${radii.pill};background:${colors['success-soft']};padding:8px 16px;font-family:${FONT_STACK};font-size:15px;line-height:1.2;font-weight:700;color:${colors.success};">&#10003;&nbsp; ${escapeHtml(b.text)}</td></tr></table>`;
    case 'plan':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-radius:${radii.card};background:${colors.grey};"><tr><td style="padding:24px;">
<p style="margin:0 0 4px;font-family:${FONT_STACK};font-size:22px;line-height:1.25;font-weight:700;color:${colors.black};">${escapeHtml(b.title)}</p>
<p style="margin:0 0 18px;font-family:${FONT_STACK};line-height:1.2;color:${colors.black};"><span style="font-size:32px;font-weight:800;">${escapeHtml(b.price)}</span> <span style="font-size:17px;color:${colors['grey-text']};">${escapeHtml(b.per)}</span></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${b.rows
        .map(
          ([k, v]) =>
            `<tr><td valign="top" style="padding:6px 12px 6px 0;width:40%;font-family:${FONT_STACK};font-size:15px;line-height:1.45;color:${colors['grey-text']};">${escapeHtml(k)}</td><td valign="top" style="padding:6px 0;font-family:${FONT_STACK};font-size:15px;line-height:1.45;font-weight:700;color:${colors.black};">${escapeHtml(v)}</td></tr>`,
        )
        .join('')}</table>
</td></tr></table>`;
    case 'error':
      return `<p style="margin:0 0 18px;padding:14px 18px;border-radius:${radii.card};background:${colors['danger-soft']};${text}color:${colors.danger};font-weight:700;">${escapeHtml(b.text)}</p>`;
    case 'url':
      return `<p style="margin:0 0 18px;${text}font-size:15px;color:${colors['grey-text']};">${escapeHtml(b.text)}<br><a href="${escapeHtml(safeUrl(b.url))}" style="color:${colors.black};word-break:break-all;">${escapeHtml(safeUrl(b.url))}</a></p>`;
    case 'button':
      // A table cell with bgcolor: the pill shows in clients that ignore padding on links.
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 24px;"><tr><td bgcolor="${colors.yellow}" style="border-radius:${radii.pill};background:${colors.yellow};"><a href="${escapeHtml(safeUrl(b.url))}" style="display:inline-block;padding:15px 30px;border-radius:${radii.pill};font-family:${FONT_STACK};font-size:18px;font-weight:700;line-height:1;color:${colors.black};text-decoration:none;">${escapeHtml(b.label)}</a></td></tr></table>`;
    case 'summary':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;border-radius:${radii.card};background:${colors.grey};"><tr><td style="padding:20px 24px;">${b.rows
        .map(([k, v]) => `<p style="margin:0 0 6px;${text}"><span style="color:${colors['grey-text']};">${escapeHtml(k)}:</span> <strong>${escapeHtml(v)}</strong></p>`)
        .join('')}</td></tr></table>`;
  }
}

function blockText(b: Block): string {
  switch (b.kind) {
    case 'p':
    case 'small':
    case 'success':
    case 'badge':
    case 'error':
      return b.text;
    case 'plan':
      return [`${b.title}: ${b.price} ${b.per}`, ...b.rows.map(([k, v]) => `${k}: ${v}`)].join('\n');
    case 'button':
      return `${b.label}: ${safeUrl(b.url)}`;
    case 'url':
      return `${b.text}\n${safeUrl(b.url)}`;
    case 'summary':
      return b.rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  }
}

export function render(c: EmailContent): RenderedEmail {
  const footerText = c.footer ?? `${ASSOCIATION.name}, ${ASSOCIATION.address}. Questions? Reply to this email or write to ${ASSOCIATION.email}.`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(c.subject)}</title>
<style>
@font-face { font-family: '${font.family}'; font-style: normal; font-weight: 300 900; font-display: swap; src: url('${SITE_ORIGIN}/fonts/${font.file}') format('woff2'); }
body { margin: 0; padding: 0; }
a { color: ${colors.black}; }
</style>
</head>
<body style="margin:0;padding:0;background:${colors.black};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${colors.black};">
<tr><td align="center" style="padding:0 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:28px 8px 24px;"><a href="${SITE_ORIGIN}" style="text-decoration:none;"><img src="${SITE_ORIGIN}/images/logo/wordmark-white-email.png" width="206" height="30" alt="ZurichJS" style="display:block;border:0;width:206px;height:30px;color:${colors.white};font-family:${FONT_STACK};font-size:22px;font-weight:700;"></a></td></tr>
<tr><td style="background:${colors.white};border-radius:${radii.card};padding:36px 32px 18px;">
<h1 style="margin:0 0 20px;font-family:${FONT_STACK};font-size:28px;line-height:1.2;font-weight:700;color:${colors.black};">${escapeHtml(c.heading)}</h1>
${c.blocks.map(blockHtml).join('\n')}
</td></tr>
<tr><td style="padding:24px 8px 36px;font-family:${FONT_STACK};font-size:14px;line-height:1.55;color:${colors['grey-light']};">${escapeHtml(ASSOCIATION.name)}, ${escapeHtml(ASSOCIATION.address)}<br>Questions? Reply to this email or write to <a href="mailto:${ASSOCIATION.email}" style="color:${colors.white};">${ASSOCIATION.email}</a>.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
  const body = [c.heading, ...c.blocks.map(blockText), '--', footerText].join('\n\n');
  return { subject: c.subject, html, text: `${body}\n` };
}
