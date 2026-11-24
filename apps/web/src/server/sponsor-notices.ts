/**
 * Notices a sponsorship change owes: the sponsor's emails and the board's Slack notes
 * (docs/domains/sponsorship/overview.md, "Notices"). They are written to `sponsor_notices` with the
 * change (`transition({ notices })`, or `queueNotices` right after it), then sent: by the request
 * that made the change, and by the daily check for anything a request could not send (a timeout,
 * Resend or Slack down, a function stopped by the platform). So a saved change is never left
 * without its email or note, and the key makes each one once only: a retried request or a second
 * delivery of a Stripe event queues nothing new.
 *
 * An email is rendered when it is sent, from the sponsorship as it is then and the props stored
 * with the notice. Each contact's email carries the notice key as its Resend idempotency key.
 */
import type { TemplateName, TemplateProps, SponsorProps } from '@zurichjs/emails';
import type { NewNotice, SponsorNotice } from '@zurichjs/sponsorship';
import { emailEach, sponsorSlack, type NotifyDeps } from './sponsor.ts';

/** The template's own props; the shared sponsor props come from the sponsorship when it is sent, unless given here (a plan not saved yet). */
type Props<N extends TemplateName> = Omit<TemplateProps<N>, keyof SponsorProps> & Partial<SponsorProps>;

type NoticeBody = { kind: 'email'; template: TemplateName; props: Record<string, unknown>; to?: 'all' | 'billing' } | { kind: 'slack'; text: string };

export const emailNotice = <N extends TemplateName>(key: string, template: N, props: Props<N>, to?: 'all' | 'billing'): NewNotice => ({
  key,
  body: { kind: 'email', template, props: props as Record<string, unknown>, ...(to ? { to } : {}) } satisfies NoticeBody,
});

export const slackNotice = (key: string, text: string): NewNotice => ({ key, body: { kind: 'slack', text } satisfies NoticeBody });

/** How long one notice can take when Resend or Slack is slow (their own timeouts are 15 s). */
const PER_NOTICE_MS = 16_000;

/** Throws when the notice was not delivered, so it stays queued. */
async function send(n: SponsorNotice, deps: NotifyDeps): Promise<void> {
  const body = n.body as NoticeBody;
  if (body.kind === 'slack') {
    await (deps.slack ?? sponsorSlack(deps.env, deps.fetch)).post(body.text);
    return;
  }
  const s = await deps.store.get(n.sponsorId);
  if (!s) return;
  const r = await emailEach(s, body.template, (base) => ({ ...base, ...body.props }) as TemplateProps<typeof body.template>, { ...deps, to: body.to, key: n.key });
  if (r.failed) throw new Error(`${r.failed} of ${r.sent + r.failed} emails failed`);
}

/**
 * Sends queued notices (of one sponsor, or all of them), oldest first. Never throws: a notice that
 * fails stays queued for the next try. With `budget` (a request or scheduled-function deadline,
 * deadline.ts once it exists) it stops claiming once too little time is left.
 */
export async function sendNotices(
  deps: NotifyDeps,
  opts: { sponsorId?: string; limit?: number; budget?: { remaining(): number } } = {},
): Promise<{ sent: number; failed: number }> {
  const out = { sent: 0, failed: 0 };
  const log = deps.log ?? console.log;
  let claimed: SponsorNotice[];
  try {
    claimed = await deps.store.claimNotices({ sponsorId: opts.sponsorId, limit: opts.limit ?? 20 });
  } catch (cause) {
    log(`[sponsorship] notices not read: ${(cause as Error).message}`);
    return out;
  }
  for (const [i, n] of claimed.entries()) {
    if (opts.budget && opts.budget.remaining() < PER_NOTICE_MS) {
      for (const rest of claimed.slice(i)) await deps.store.noticeDone(rest.id, 'not sent: out of time').catch(() => undefined);
      break;
    }
    try {
      await send(n, deps);
      await deps.store.noticeDone(n.id);
      out.sent++;
    } catch (cause) {
      out.failed++;
      log(`[sponsorship] notice ${n.key} not sent, tried again later: ${(cause as Error).message}`);
      await deps.store.noticeDone(n.id, (cause as Error).message).catch(() => undefined);
    }
  }
  return out;
}
