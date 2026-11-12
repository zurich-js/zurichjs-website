/**
 * "Your talk is scheduled" emails to speakers (docs/v2/AUTOMATION.md, "Telling speakers their talk
 * is scheduled"). Deterministic code, not the model: there is no model tool for it.
 *
 *   1. After Publish (or Publish all), `scheduledTalks` looks at the published events: a talk that is
 *      new in an event's running order, made from a talk proposal (talkSubmission.talkReference) that
 *      is `scheduled`, gets a card in the thread (`talkEmailCard`) with Send email and Not now.
 *   2. Send email (SLACK_PUBLISHER_IDS only) reads the talk, the event and the speakers' emails fresh
 *      from Sanity, has the host send one email per speaker (the host renders and sends it; the
 *      Resend idempotency key is per proposal, event and speaker), then appends a line to the
 *      proposal's review notes and rewrites the card.
 *
 * Speaker emails stay in this code: Slack only ever shows them masked (a•••@example.com) and they
 * never reach the model. Every fact in the card and the email comes from Sanity; a missing date,
 * time or venue is said as "We'll confirm the details soon", never guessed.
 */
import { dateLong, inferKind, time, venueAddress, zoneLabel } from '@zurichjs/events';
import type { PublishedDoc } from './publish.ts';
import { draftIdOf, publishedIdOf, type ContentStore, type SanityDoc } from './store.ts';
import { formatZurich } from './time.ts';

export const SEND_TALK_EMAIL = 'talk_email_send';
export const SKIP_TALK_EMAIL = 'talk_email_skip';
export const isTalkEmailAction = (id: string) => id === SEND_TALK_EMAIL || id === SKIP_TALK_EMAIL;

/** Said in the card and the email when Sanity does not have the date, the time or the venue yet. */
export const DETAILS_SOON = "We'll confirm the details soon";

export interface ScheduledSpeaker {
  /** Sanity document id. */
  id: string;
  /** The public speaker id (`id.current`), for the private profile link. */
  slug: string | null;
  name: string;
  /** Only for sending. Never shown in Slack unmasked and never given to the model. */
  email: string | null;
}

export interface ScheduledTalk {
  submissionId: string;
  eventId: string;
  talkId: string;
  talkTitle: string;
  eventTitle: string;
  eventSlug: string | null;
  speakers: ScheduledSpeaker[];
  /** "Wed 18th Nov 2026", or null when the event has no date. */
  date: string | null;
  /** "Doors 18:00 CET" when the agenda has a timed doors line, else the start ("Starts 18:30 CET"), else null. */
  time: string | null;
  /** "Venue AG, Hardstrasse 201, 8005 Zürich", or null when no venue is set. */
  venue: string | null;
  /** The proposal's review notes, to see whether this email went out before. Never shown. */
  reviewNotes: string;
}

type Ref = { _ref?: string };
const refs = (v: unknown): string[] => (Array.isArray(v) ? (v as Ref[]).map((r) => r?._ref).filter((r): r is string => typeof r === 'string') : []);
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Slack mrkdwn needs &, < and > escaped in text that came from people. */
export const escMrkdwn = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** "ada@example.com" → "a•••@example.com". The only form of an email Slack ever sees. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return '•••';
  return `${email[0]}•••${email.slice(at)}`;
}

/** "Ada", "Ada and Grace", "Ada, Grace and Linus". */
export const names = (list: string[]) => (list.length <= 1 ? (list[0] ?? '') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`);

/** The draft if there is one (like the Studio), else the published document. */
async function latest(store: ContentStore, id: string): Promise<SanityDoc | null> {
  return (await store.getDocument(draftIdOf(id))) ?? (await store.getDocument(publishedIdOf(id)));
}

/** The facts the card previews and the email says, from the published event only. */
function eventFacts(ev: SanityDoc): Pick<ScheduledTalk, 'date' | 'time' | 'venue'> {
  const startsAt = str(ev.datetime);
  const agenda = Array.isArray(ev.agenda) ? (ev.agenda as { kind?: string; title?: string; time?: string; talk?: unknown }[]) : [];
  const doors = agenda.find((a) => inferKind(a) === 'doors' && /^\d{2}:\d{2}$/.test(a.time ?? ''))?.time;
  const v = (ev.venue ?? {}) as { name?: string; street?: string; zip?: string; city?: string };
  const venueName = str(v.name) ?? str(ev.location);
  const address = v.city ? venueAddress({ street: v.street, zip: v.zip, city: v.city }) : str(ev.address);
  return {
    date: startsAt ? dateLong(startsAt) : null,
    time: startsAt ? `${doors ? `Doors ${doors}` : `Starts ${time(startsAt)}`} ${zoneLabel(startsAt)}` : null,
    venue: venueName ? [venueName, address].filter(Boolean).join(', ') : null,
  };
}

/**
 * Reads one scheduled talk fresh from Sanity: the published event, the proposal (draft wins), its
 * talk (published) and the talk's speakers with their emails. Null when any of them is gone.
 */
export async function loadScheduledTalk(store: ContentStore, submissionId: string, eventId: string): Promise<ScheduledTalk | null> {
  const [ev, sub] = await Promise.all([store.getDocument(publishedIdOf(eventId)), latest(store, submissionId)]);
  if (!ev || ev._type !== 'events' || !sub || sub._type !== 'talkSubmission') return null;
  const talkId = (sub.talkReference as Ref | undefined)?._ref;
  if (!talkId) return null;
  const talk = await store.getDocument(publishedIdOf(talkId));
  if (!talk) return null;
  const speakerIds = refs(talk.speakers);
  const docs = speakerIds.length ? await store.query<SanityDoc[]>(`*[_id in $ids]{ _id, name, email, id }`, { ids: speakerIds }) : [];
  const speakers = speakerIds.flatMap((id): ScheduledSpeaker[] => {
    const s = docs.find((d) => d._id === id);
    if (!s) return [];
    return [{ id, slug: str((s.id as { current?: string } | undefined)?.current), name: str(s.name) ?? 'the speaker', email: str(s.email) }];
  });
  return {
    submissionId: publishedIdOf(sub._id),
    eventId: publishedIdOf(ev._id),
    talkId: publishedIdOf(talkId),
    talkTitle: str(talk.title) ?? str(sub.title) ?? 'your talk',
    eventTitle: str(ev.title) ?? 'the meetup',
    eventSlug: str((ev.id as { current?: string } | undefined)?.current),
    speakers,
    ...eventFacts(ev),
    reviewNotes: String(sub.reviewNotes ?? ''),
  };
}

/**
 * The talks a Publish press put on a meetup: talks that are new in a published event's running
 * order and were made from a talk proposal with status `scheduled`. Cancelled and postponed events
 * get no card. Read from the published documents, never from the model.
 */
export async function scheduledTalks(published: PublishedDoc[], store: ContentStore): Promise<ScheduledTalk[]> {
  const out: ScheduledTalk[] = [];
  for (const p of published) {
    if (p.type !== 'events' || p.after.status === 'cancelled' || p.after.status === 'postponed') continue;
    const before = new Set(refs(p.before?.talks).map(publishedIdOf));
    const added = refs(p.after.talks)
      .map(publishedIdOf)
      .filter((id) => !before.has(id));
    if (!added.length) continue;
    const subs = await store.query<SanityDoc[]>(`*[_type == "talkSubmission" && talkReference._ref in $talks]{ _id, _type, status, talkReference }`, { talks: added });
    // Draft wins, like in the Studio; one entry per proposal.
    const current = new Map<string, SanityDoc>();
    for (const s of subs) if (s._type === 'talkSubmission' && (!current.has(publishedIdOf(s._id)) || s._id.startsWith('drafts.'))) current.set(publishedIdOf(s._id), s);
    for (const talkId of added) {
      const sub = [...current.values()].find((s) => s.status === 'scheduled' && publishedIdOf((s.talkReference as Ref | undefined)?._ref ?? '') === talkId);
      if (!sub) continue;
      const t = await loadScheduledTalk(store, sub._id, p.id);
      if (t) out.push(t);
    }
  }
  return out;
}

/** The review-notes line once the email went out; also how a second Send is recognised. */
const SENT_NOTE = 'Scheduled email sent on';
const sentNote = (t: ScheduledTalk, user: string, when: string) => `${SENT_NOTE} ${when} by <@${user}> for ${t.eventTitle}`;
const alreadySent = (t: ScheduledTalk) => t.reviewNotes.split('\n').some((l) => l.startsWith(SENT_NOTE) && l.endsWith(` for ${t.eventTitle}`));

export interface SlackCard {
  text: string;
  blocks: unknown[];
}

const question = (t: ScheduledTalk) => `Let ${names(t.speakers.map((s) => s.name)) || 'the speaker'} know “${t.talkTitle}” is on ${t.eventTitle}?`;

function preview(t: ScheduledTalk): unknown {
  const soon = `_${DETAILS_SOON}_ (not in Sanity yet)`;
  const to = t.speakers.map((s) => `${escMrkdwn(s.name)} (${s.email ? escMrkdwn(maskEmail(s.email)) : 'no email in Sanity'})`).join(', ');
  const lines = [
    `*Meetup:* ${escMrkdwn(t.eventTitle)}`,
    `*Date:* ${t.date ? escMrkdwn(t.date) : soon}`,
    `*Time:* ${t.time ? escMrkdwn(t.time) : soon}`,
    `*Venue:* ${t.venue ? escMrkdwn(t.venue) : soon}`,
    `*To:* ${to || 'no speakers on the talk'}`,
  ];
  return { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } };
}

const head = (t: ScheduledTalk) => ({ type: 'section', text: { type: 'mrkdwn', text: `:email: ${escMrkdwn(question(t))}` } });
const note = (text: string) => ({ type: 'context', elements: [{ type: 'mrkdwn', text }] });

/** The card posted after publishing. No Send button when no speaker has an email in Sanity. */
export function talkEmailCard(t: ScheduledTalk): SlackCard {
  const value = JSON.stringify({ s: t.submissionId, e: t.eventId });
  const reachable = t.speakers.filter((s) => s.email);
  const blocks: unknown[] = [head(t), preview(t)];
  if (!reachable.length) {
    blocks.push(
      note(
        `${t.speakers.length ? 'No email for the speaker in Sanity' : 'The talk has no speakers'}, so the bot cannot send it. Add the email in the Studio, or write to them yourself.`,
      ),
    );
    return { text: escMrkdwn(question(t)), blocks };
  }
  blocks.push(note('The email links to the event page and to their private speaker page to check their bio and photo. Replies go to the organisers.'), {
    type: 'actions',
    elements: [
      { type: 'button', style: 'primary', text: { type: 'plain_text', text: 'Send email' }, action_id: SEND_TALK_EMAIL, value },
      { type: 'button', text: { type: 'plain_text', text: 'Not now' }, action_id: SKIP_TALK_EMAIL, value },
    ],
  });
  return { text: escMrkdwn(question(t)), blocks };
}

/** The card after a button: the question and preview stay, the buttons become one line. */
const closed = (t: ScheduledTalk, outcome: string): SlackCard => ({ text: outcome, blocks: [head(t), preview(t), note(outcome)] });

/** One speaker's email went out (`sent`), or was not sent because email is not set up here. */
export interface SendOutcome {
  speaker: ScheduledSpeaker;
  sent: boolean;
}

export interface TalkEmailClick {
  action: string;
  /** The button value: {"s": proposal id, "e": event id}. */
  value: string;
  user: string;
  publishers: Set<string>;
  store: ContentStore;
  /** Renders and sends one email per speaker with an email (the host: apps/web/src/server/talk-scheduled.ts). */
  send: (t: ScheduledTalk, speakers: ScheduledSpeaker[]) => Promise<SendOutcome[]>;
  now?: () => Date;
}

/** What the click changes in Slack: the card rewritten, and/or a line in the thread. */
export interface TalkEmailResult {
  card?: SlackCard;
  message?: string;
}

/** Adds a line to the proposal's review notes: on its draft when one is open, else as a draft that is published at once. */
async function appendReviewNote(store: ContentStore, submissionId: string, line: string): Promise<void> {
  const draftId = draftIdOf(submissionId);
  const draft = await store.getDocument(draftId);
  const doc = draft ?? (await store.getDocument(publishedIdOf(submissionId)));
  if (!doc) return;
  const reviewNotes = [String(doc.reviewNotes ?? '').trim(), line].filter(Boolean).join('\n');
  if (draft) {
    // Someone has unpublished changes on it: add the line there and leave publishing to them.
    await store.patchDraft(draftId, { reviewNotes });
    return;
  }
  const { _rev, _createdAt, _updatedAt, ...rest } = doc;
  await store.saveDraft({ ...rest, _id: draftId, reviewNotes } as SanityDoc);
  await store.publish(draftId, publishedIdOf(submissionId));
}

export async function handleTalkEmailClick(c: TalkEmailClick): Promise<TalkEmailResult> {
  const { s, e } = JSON.parse(c.value) as { s: string; e: string };
  const t = await loadScheduledTalk(c.store, s, e);
  if (c.action === SKIP_TALK_EMAIL) {
    const outcome = `Not sent (<@${c.user}>).`;
    return t ? { card: closed(t, outcome) } : { message: outcome };
  }
  if (!c.publishers.has(c.user)) return { message: `<@${c.user}>, only organisers on the publish list can send emails to speakers. Ask one of them to press Send email.` };
  if (!t) return { message: 'The talk, its proposal or the meetup is not in Sanity any more (or not published), so nothing was sent.' };
  if (alreadySent(t)) return { card: closed(t, 'Already sent: the proposal’s review notes say so. Nothing was sent again.') };
  const reachable = t.speakers.filter((sp) => sp.email);
  if (!reachable.length) return { card: talkEmailCard(t) };

  const results = await c.send(t, reachable);
  const sent = new Set(results.filter((r) => r.sent).map((r) => r.speaker.id));
  if (!sent.size) return { message: 'Not sent: email is not set up on this site (RESEND_API_KEY). Nothing changed.' };
  const when = formatZurich((c.now?.() ?? new Date()).toISOString());
  await appendReviewNote(c.store, t.submissionId, sentNote(t, c.user, when));
  const to = t.speakers.filter((sp) => sent.has(sp.id)).map((sp) => sp.name);
  const missing = t.speakers.filter((sp) => !sent.has(sp.id)).map((sp) => sp.name);
  const outcome = `Sent to ${escMrkdwn(names(to))} by <@${c.user}> on ${when}.${missing.length ? ` Not sent to ${escMrkdwn(names(missing))}: no email in Sanity.` : ''}`;
  return { card: closed(t, outcome) };
}
