import { createHash } from 'node:crypto';
import { createClient, type SanityClient } from '@sanity/client';
import type { FormData, FormKind, FormResult } from '@zurichjs/forms';

/**
 * Where submitted forms go. Every channel reads its secret from the
 * environment; when a secret is missing the channel logs a stub line and the
 * form still succeeds, so the site works before every integration is set up.
 */
export type Env = Record<string, string | undefined>;
type Log = (msg: string) => void;

/* ------------------------------------------------------------------ talk proposals (Sane seam) */

export interface TalkProposal {
  name: string;
  email: string;
  title: string;
  format: string;
  abstract?: string;
  level?: string;
  /** Stored as `talkSubmission.tags`. */
  topics?: string[];
  target?: string;
  /** Speaker profile, as on production's CFP. Written only to a NEW speaker document. */
  jobTitle?: string;
  bio?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  /** The person says they have spoken at ZurichJS before. */
  returning?: boolean;
  /** The person has not given a talk before: organisers offer help preparing. */
  firstTalk?: boolean;
}

/** Seam for talk proposals. Today: Sanity `talkSubmission`. Later: Sane (docs/v2/SANE-READINESS.md). */
export interface TalkProposalSink {
  submit(p: TalkProposal): Promise<{ id: string }>;
}

const FORMAT_MINUTES: Record<string, number> = { lightning: 5, 'lightning talk': 5, standard: 25, 'standard talk': 25, talk: 25, 'deep dive': 35 };
const minutesFor = (format: string) => FORMAT_MINUTES[format.trim().toLowerCase()] ?? 25;
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);

/**
 * A profile link as an absolute https URL (the speaker schema's url fields).
 * Accepts a full link, a link without "https://" or a handle ("ada", "@ada"),
 * as production did for GitHub and X.
 */
export function profileUrl(v: string | undefined, base: string): string | undefined {
  const s = v?.trim();
  if (!s) return undefined;
  const raw = /^https?:\/\//i.test(s) ? s : /^([\w-]+\.)+[a-z]{2,}(\/|$)/i.test(s) ? `https://${s}` : /^@?[\w.-]+$/.test(s) ? `${base}${s.replace(/^@/, '')}` : '';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined;
    u.protocol = 'https:';
    return u.toString();
  } catch {
    return undefined;
  }
}

/** The profile fields of a proposal, as speaker document fields (empty ones left out). */
export function speakerFields(p: TalkProposal): { title?: string; bio?: string; linkedin?: string; github?: string; twitter?: string } {
  const out = {
    title: p.jobTitle?.trim() || undefined,
    bio: p.bio?.trim() || undefined,
    linkedin: profileUrl(p.linkedin, 'https://www.linkedin.com/in/'),
    github: profileUrl(p.github, 'https://github.com/'),
    twitter: profileUrl(p.twitter, 'https://x.com/'),
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
}

/** Notes for the organisers on the submission (the Studio's internal "Review Notes"). */
function reviewNotes(p: TalkProposal, matched: boolean): string | undefined {
  const lines: string[] = [];
  if (p.firstTalk) lines.push('First talk: offer help preparing.');
  if (p.returning && !matched) lines.push('Says they have spoken at ZurichJS before, but no speaker has this email. Check for a duplicate speaker.');
  const f = speakerFields(p);
  if (matched && Object.keys(f).length) {
    lines.push('Profile details sent with this proposal. The speaker page was NOT changed: update it, or send a profile link (pnpm speaker-link).');
    for (const [k, v] of Object.entries(f)) lines.push(`${k === 'title' ? 'job title' : k}: ${v}`);
  }
  return lines.length ? lines.join('\n') : undefined;
}

/** Write token. SANITY_TOKEN is the production site's existing variable (one token for reads and writes). */
const sanityWriteToken = (env: Env) => env.SANITY_WRITE_TOKEN || env.SANITY_TOKEN || undefined;

export const sanityWriteClient = (env: Env): SanityClient | null =>
  sanityWriteToken(env)
    ? createClient({
        projectId: env.SANITY_PROJECT_ID ?? 'viqjrovw',
        dataset: env.SANITY_DATASET ?? 'production',
        apiVersion: '2026-10-01',
        token: sanityWriteToken(env),
        useCdn: false,
      })
    : null;

/**
 * Same documents as the production /api/submit-talk: a speaker (matched by
 * email) and a pending talkSubmission. Unlike production, this public form
 * never patches an existing speaker's page: what they sent goes into the
 * submission's review notes, and the page changes through their private
 * profile link or an organiser.
 */
export const sanityTalkProposals = (client: SanityClient, now = () => new Date()): TalkProposalSink => ({
  async submit(p) {
    const existing = await client.fetch<string | null>(`*[_type == "speaker" && lower(email) == lower($email)][0]._id`, { email: p.email });
    const speakerId =
      existing ??
      (
        await client.create({
          _type: 'speaker',
          id: { _type: 'slug', current: `${slug(p.name)}-${now().getTime().toString(36)}` },
          name: p.name,
          email: p.email,
          bio: '',
          ...speakerFields(p),
          isVisible: false,
        })
      )._id;
    const notes = reviewNotes(p, !!existing);
    const doc = await client.create({
      _type: 'talkSubmission',
      id: { _type: 'slug', current: `${slug(p.title)}-${now().getTime().toString(36)}` },
      title: p.title,
      description: p.abstract ?? '',
      durationMinutes: minutesFor(p.format),
      level: p.level,
      tags: p.topics ?? [],
      speakers: [{ _type: 'reference', _ref: speakerId, _key: speakerId.slice(0, 12) }],
      status: 'pending',
      firstTalk: p.firstTalk === true,
      ...(notes ? { reviewNotes: notes } : {}),
      submittedAt: now().toISOString(),
    });
    return { id: doc._id };
  },
});

/* ------------------------------------------------------------------ messages */

export async function sendEmail(env: Env, subject: string, text: string, replyTo?: string, log: Log = console.log): Promise<void> {
  if (!env.RESEND_API_KEY) return log(`[forms] RESEND_API_KEY missing; email not sent: ${subject}`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.FORMS_FROM ?? 'ZurichJS website <website@zurichjs.com>',
      to: [env.FORMS_TO ?? 'hello@zurichjs.com'],
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}`);
}

/**
 * Posts to Slack through an incoming webhook (SLACK_WEBHOOK_URL) or, as the production site
 * already does, through the bot API (SLACK_BOT_TOKEN + SLACK_DEFAULT_CHANNEL).
 */
export async function postSlack(env: Env, text: string, log: Log = console.log): Promise<void> {
  if (env.SLACK_WEBHOOK_URL) {
    const res = await fetch(env.SLACK_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
    if (!res.ok) throw new Error(`Slack ${res.status}`);
    return;
  }
  if (env.SLACK_BOT_TOKEN && env.SLACK_DEFAULT_CHANNEL) {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.SLACK_BOT_TOKEN}`, 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ channel: env.SLACK_DEFAULT_CHANNEL, text, mrkdwn: true }),
    });
    // The bot API answers 200 with { ok: false, error } on failure.
    const body = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) throw new Error(`Slack ${body.error ?? res.status}`);
    return;
  }
  log(`[forms] SLACK_WEBHOOK_URL (or SLACK_BOT_TOKEN + SLACK_DEFAULT_CHANNEL) missing; Slack message not sent: ${text.split('\n')[0]}`);
}

const summary = (data: Record<string, unknown>) =>
  Object.entries(data)
    .filter(([k, v]) => v !== undefined && v !== '' && k !== 'website_url')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('\n');

/* ------------------------------------------------------------------ dispatcher */

export interface ForwardDeps {
  env: Env;
  sanity?: SanityClient | null;
  proposals?: TalkProposalSink;
  log?: Log;
  now?: () => Date;
  /** Who sent it, hashed before storing; used to refuse a second rating of the same talk. */
  client?: { ip?: string; headers?: Record<string, string | undefined> };
}

const flag = (v: unknown) => v === true || v === 'true' || v === 'on';
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Same hashes as the old site's /api/feedback, so earlier ratings still count for duplicate checks. */
export function clientHashes(client: ForwardDeps['client'] = {}) {
  const h = client.headers ?? {};
  return {
    ipHash: sha256(client.ip ?? ''),
    browserFingerprint: sha256(
      JSON.stringify({ userAgent: h['user-agent'] ?? '', accept: h.accept ?? '', acceptLanguage: h['accept-language'] ?? '', acceptEncoding: h['accept-encoding'] ?? '' }),
    ),
  };
}

/** A form that was understood but cannot be accepted (duplicate rating, unknown talk). Maps to 409 or 400. */
export class FormRejected extends Error {
  constructor(
    message: string,
    readonly status: 400 | 409,
  ) {
    super(message);
  }
}

/** Sends a validated form to its destinations. Throws only when a configured channel fails. */
export async function forwardForm<K extends FormKind>(kind: K, data: FormData<K>, deps: ForwardDeps): Promise<FormResult> {
  const { env, log = console.log, now = () => new Date() } = deps;
  const sanity = deps.sanity === undefined ? sanityWriteClient(env) : deps.sanity;
  const d = data as Record<string, unknown>;
  const id = `${kind}_${now().getTime().toString(36)}`;

  switch (kind) {
    case 'cfp': {
      const sink = deps.proposals ?? (sanity ? sanityTalkProposals(sanity, now) : undefined);
      const proposal: TalkProposal = {
        name: String(d.name),
        email: String(d.email),
        title: String(d.title),
        format: String(d.format),
        abstract: d.abstract as string | undefined,
        level: d.level as string | undefined,
        topics: Array.isArray(d.topics) ? d.topics.map(String) : undefined,
        target: d.target as string | undefined,
        jobTitle: d.jobTitle as string | undefined,
        bio: d.bio as string | undefined,
        linkedin: d.linkedin as string | undefined,
        github: d.github as string | undefined,
        twitter: d.twitter as string | undefined,
        returning: flag(d.returning),
        firstTalk: flag(d.firstTalk),
      };
      const saved = sink ? await sink.submit(proposal) : (log('[forms] SANITY_WRITE_TOKEN missing; talk proposal not stored'), { id });
      const facts = [`${minutesFor(proposal.format)} min`, proposal.level, proposal.topics?.join(', ')].filter(Boolean).join(', ');
      await postSlack(
        env,
        `New talk proposal: “${proposal.title}” by ${proposal.name} (${facts})${proposal.returning ? ', has spoken at ZurichJS before' : ''}${proposal.firstTalk ? ', their first talk: offer help preparing' : ''}`,
        log,
      );
      return { ok: true, id: saved.id };
    }
    case 'partners':
    case 'contact': {
      const subject = kind === 'partners' ? `Partner inquiry from ${String(d.org)}` : `Contact: ${String(d.topic)} from ${String(d.name)}`;
      await Promise.all([sendEmail(env, subject, summary(d), String(d.email), log), postSlack(env, `${subject}\n${summary(d)}`, log)]);
      return { ok: true, id };
    }
    case 'feedback': {
      if (!sanity) {
        log('[forms] SANITY_WRITE_TOKEN missing; evening feedback not stored');
        return { ok: true, id };
      }
      const doc = await sanity.create({
        _type: 'comprehensiveFeedback',
        event: { _type: 'reference', _ref: String(d.eventId) },
        eventId: String(d.eventId),
        eventType: 'meetup',
        overallRating: Number(d.overall),
        // V2 questions (apps/web feedback form) → comprehensiveFeedback fields.
        moreOf: d.more,
        improvements: d.less,
        futureTopics: d.next,
        arrivalIssues: d.first,
        describeToFriend: d.friend,
        quoteConsent: d.quote === true || d.quote === 'yes',
        // Only kept when quoting is allowed.
        quoteName: (d.quote === true || d.quote === 'yes') && typeof d.quoteName === 'string' && d.quoteName.trim() ? d.quoteName.trim().slice(0, 60) : undefined,
        email: d.email || undefined,
        submittedAt: now().toISOString(),
      });
      return { ok: true, id: doc._id };
    }
    case 'rating': {
      // One rating per person per speaker per talk. The talk is a document id;
      // the speaker arrives as their public ID and is resolved to a document.
      const talkId = String(d.talkId ?? (d.target !== 'evening' ? String(d.target).split(':')[0] : ''));
      const speakerSlug = d.speakerId ? String(d.speakerId) : '';
      if (!talkId) throw new FormRejected('Choose a talk to rate.', 400);
      if (!sanity) {
        log(`[forms] SANITY_WRITE_TOKEN missing; rating for talk ${talkId}${speakerSlug ? ` / ${speakerSlug}` : ''} not stored`);
        return { ok: true, id };
      }
      const eventId = String(d.eventId);
      const found = await sanity.fetch<{ event?: string; talk?: string; inEvent?: boolean; speaker?: string; speakers?: string[] }>(
        `{
          "event": *[_id == $eventId][0]._id,
          "talk": *[_id == $talkId][0]._id,
          "inEvent": count(*[_id == $eventId && ($talkId in talks[]._ref || $talkId in agenda[].talk._ref || $talkId in recap.talks[].talk._ref)]) > 0,
          "speaker": *[_type == "speaker" && id.current in $speakerSlugs][0]._id,
          "speakers": *[_id == $talkId][0].speakers[]._ref
        }`,
        // The site trims speaker IDs; a few stored IDs still carry stray spaces (Studio scripts/clean-speaker-slugs.ts).
        { eventId, talkId, speakerSlugs: speakerSlug ? [speakerSlug, ` ${speakerSlug}`, `${speakerSlug} `] : [] },
      );
      if (!found.event || !found.talk || !found.inEvent) throw new FormRejected('We couldn’t find that talk for this event. Reload the page and try again.', 400);
      // A talk with one speaker may be rated without naming them.
      const speaker = found.speaker ?? (found.speakers?.length === 1 ? found.speakers[0] : undefined);
      if (!speaker || !(found.speakers ?? []).includes(speaker)) throw new FormRejected('We couldn’t find that speaker for this talk. Reload the page and try again.', 400);
      const { ipHash, browserFingerprint } = clientHashes(deps.client);
      const dup = await sanity.fetch<string | null>(
        `*[_type == "feedback" && event._ref == $eventId && talk._ref == $talkId && speaker._ref == $speaker && (ipHash == $ipHash || browserFingerprint == $browserFingerprint)][0]._id`,
        { eventId, talkId, speaker, ipHash, browserFingerprint },
      );
      if (dup) throw new FormRejected('You already rated this talk. Thanks!', 409);
      const doc = await sanity.create({
        _type: 'feedback',
        event: { _type: 'reference', _ref: eventId },
        talk: { _type: 'reference', _ref: talkId },
        speaker: { _type: 'reference', _ref: speaker },
        rating: Number(d.stars),
        comment: typeof d.note === 'string' ? d.note.slice(0, 2000) : '',
        submittedAt: now().toISOString(),
        ipHash,
        browserFingerprint,
      });
      return { ok: true, id: doc._id };
    }
    default:
      return { ok: false, error: 'Unknown form' };
  }
}
