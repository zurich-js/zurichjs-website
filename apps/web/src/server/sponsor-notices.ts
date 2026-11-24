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
 * A notice that says Stripe stopped (`after: 'stripe-closed'`) waits until the sponsorship no longer
 * points at anything in Stripe.
 *
 * Delivery is at least once. A notice is marked sent after Resend or Slack accepted it; if that
 * write fails twice, the claim is kept rather than released, so no sender takes the notice again
 * for five minutes. If the database still cannot record it after that, the next sender sends it
 * again: Resend drops a repeat within 24 hours (same idempotency key), Slack has no such key and
 * shows a second note.
 */
import type { TemplateName, TemplateProps, SponsorProps } from '@zurichjs/emails';
import type { NewNotice, SponsorNotice } from '@zurichjs/sponsorship';
import { emailEach, sponsorSlack, type NotifyDeps } from './sponsor.ts';
import { leftInStripe } from './sponsor-stripe.ts';

/** The template's own props; the shared sponsor props come from the sponsorship when it is sent, unless given here (a plan not saved yet). */
type Props<N extends TemplateName> = Omit<TemplateProps<N>, keyof SponsorProps> & Partial<SponsorProps>;

/** `after: 'stripe-closed'`: only once nothing is left open in Stripe (its text says Stripe stopped). */
type When = { after?: 'stripe-closed' };

type NoticeBody = ({ kind: 'email'; template: TemplateName; props: Record<string, unknown>; to?: 'all' | 'billing' } | { kind: 'slack'; text: string }) & When;

export const emailNotice = <N extends TemplateName>(key: string, template: N, props: Props<N>, to?: 'all' | 'billing', when: When = {}): NewNotice => ({
  key,
  body: { kind: 'email', template, props: props as Record<string, unknown>, ...(to ? { to } : {}), ...when } satisfies NoticeBody,
});

export const slackNotice = (key: string, text: string, when: When = {}): NewNotice => ({ key, body: { kind: 'slack', text, ...when } satisfies NoticeBody });

/** Not sent yet on purpose (Stripe still open): released for a later run, not a failure. */
class NotYet extends Error {}

/** How long one notice can take when Resend or Slack is slow (their own timeouts are 15 s). */
export const PER_NOTICE_MS = 16_000;

/** Throws when the notice was not delivered, so it stays queued. */
async function send(n: SponsorNotice, deps: NotifyDeps): Promise<void> {
  const body = n.body as NoticeBody;
  const s = body.kind === 'email' || body.after ? await deps.store.get(n.sponsorId) : null;
  if (body.after === 'stripe-closed' && s && leftInStripe(s)) throw new NotYet('waiting until Stripe is closed');
  if (body.kind === 'slack') {
    await (deps.slack ?? sponsorSlack(deps.env, deps.fetch)).post(body.text);
    return;
  }
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
): Promise<{ sent: number; failed: number; waiting: number; unrecorded: number }> {
  const out = { sent: 0, failed: 0, waiting: 0, unrecorded: 0 };
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
    } catch (cause) {
      if (cause instanceof NotYet) out.waiting++;
      else {
        out.failed++;
        log(`[sponsorship] notice ${n.key} not sent, tried again later: ${(cause as Error).message}`);
      }
      await deps.store.noticeDone(n.id, (cause as Error).message).catch(() => undefined);
      continue;
    }
    // Delivered: from here on it must not be released as failed, which would send it again.
    try {
      await deps.store.noticeDone(n.id).catch(() => deps.store.noticeDone(n.id));
      out.sent++;
    } catch (cause) {
      out.unrecorded++;
      log(`[sponsorship] notice ${n.key} was delivered but not recorded; its claim is kept, so it is not sent again for five minutes: ${(cause as Error).message}`);
    }
  }
  return out;
}
