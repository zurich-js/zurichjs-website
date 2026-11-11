/**
 * Text that goes to a public Slack channel. Anything the model or a person wrote is escaped, so the
 * bot can never post @channel, @here, a user or group mention, or a link, whatever it is asked.
 */

const ZWSP = '​';

/**
 * Escapes text for Slack mrkdwn: `&`, `<` and `>` (so `<!channel>`, `<@U…>`, `<!subteam^…>` and
 * `<https://…|…>` stay plain text), breaks `@channel`, `@here` and `@everyone`, and breaks bare
 * URLs so Slack does not turn them into links. Used with `verbatim: true` text objects.
 */
export function escapeMrkdwn(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/@(channel|here|everyone)\b/gi, `@${ZWSP}$1`)
    .replace(/\b([a-z][a-z0-9+.-]*):\/\//gi, `$1:${ZWSP}//`)
    .replace(/\bwww\./gi, `www${ZWSP}.`)
    .replace(/\b(mailto|tel|slack):/gi, `$1${ZWSP}:`);
}

/** g•••@example.com: the first letter and the domain, for the private confirmation only. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '•••';
  return `${email[0]}•••${email.slice(at)}`;
}

/** A plain_text or mrkdwn object with user content, never parsed for mentions or links. */
export const mrkdwn = (text: string) => ({ type: 'mrkdwn', text: escapeMrkdwn(text), verbatim: true });
