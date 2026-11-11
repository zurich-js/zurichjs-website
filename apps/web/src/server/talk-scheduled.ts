/**
 * Sends the "your talk is scheduled" email (packages/agent/src/speaker-email.ts decides when, after an
 * organiser presses Send email in Slack). One email per speaker, in the member emails' layout, from
 * MEMBERSHIP_FROM with replies to FORMS_TO (default hello@zurichjs.com). The Resend idempotency key
 * is per proposal, event and speaker, so a second press or a retry never sends twice.
 */
import type { ScheduledSpeaker, ScheduledTalk, SendOutcome } from '@zurichjs/agent';
import { renderEmail, type TemplateProps } from '@zurichjs/emails';
import { sendMemberEmail } from '@zurichjs/integrations';
import type { Env } from './http.ts';
import { profileLink } from './profile-token.ts';

type Log = (m: string) => void;

export const talkScheduledKey = (t: Pick<ScheduledTalk, 'submissionId' | 'eventId'>, speaker: Pick<ScheduledSpeaker, 'id'>) =>
  `talk-scheduled:${t.submissionId}:${t.eventId}:${speaker.id}`;

/** The email's props: only what Sanity has (ScheduledTalk), the event page, and the speaker's private profile link. */
export function talkScheduledProps(t: ScheduledTalk, speaker: ScheduledSpeaker, deps: { env: Env; origin: string; now?: number }): TemplateProps<'talk-scheduled'> {
  const origin = deps.origin.replace(/\/+$/, '');
  return {
    speakerName: speaker.name,
    talkTitle: t.talkTitle,
    eventTitle: t.eventTitle,
    date: t.date,
    time: t.time,
    venue: t.venue,
    eventUrl: t.eventSlug ? `${origin}/events/${encodeURIComponent(t.eventSlug)}` : `${origin}/events`,
    // The same link `pnpm speaker-link` prints (profile-token.ts), when JWT_SECRET is set.
    profileUrl: speaker.slug && deps.env.JWT_SECRET ? profileLink(speaker.slug, deps.env.JWT_SECRET, origin, 30, deps.now) : null,
  };
}

export async function sendTalkScheduledEmails(
  t: ScheduledTalk,
  speakers: ScheduledSpeaker[],
  deps: { env: Env; origin: string; fetch?: typeof fetch; log?: Log; now?: number },
): Promise<SendOutcome[]> {
  const out: SendOutcome[] = [];
  for (const speaker of speakers) {
    if (!speaker.email) continue;
    const email = renderEmail('talk-scheduled', talkScheduledProps(t, speaker, deps));
    const { sent } = await sendMemberEmail(
      deps.env,
      { to: speaker.email, replyTo: deps.env.FORMS_TO || 'hello@zurichjs.com', ...email },
      { idempotencyKey: talkScheduledKey(t, speaker), log: deps.log, fetch: deps.fetch },
    );
    out.push({ speaker, sent });
  }
  return out;
}
