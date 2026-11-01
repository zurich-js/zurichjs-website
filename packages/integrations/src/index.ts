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
  target?: string;
  bio?: string;
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

/** Same documents as the production /api/submit-talk: a speaker (matched by email) and a pending talkSubmission. */
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
          bio: p.bio ?? '',
          isVisible: false,
        })
      )._id;
    const doc = await client.create({
      _type: 'talkSubmission',
      id: { _type: 'slug', current: `${slug(p.title)}-${now().getTime().toString(36)}` },
      title: p.title,
      description: p.abstract ?? '',
      durationMinutes: minutesFor(p.format),
      level: p.level,
      speakers: [{ _type: 'reference', _ref: speakerId, _key: speakerId.slice(0, 12) }],
      status: 'pending',
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
        target: d.target as string | undefined,
        bio: d.bio as string | undefined,
      };
      const saved = sink ? await sink.submit(proposal) : (log('[forms] SANITY_WRITE_TOKEN missing; talk proposal not stored'), { id });
      await postSlack(env, `New talk proposal: “${proposal.title}” by ${proposal.name} (${proposal.format})`, log);
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
        email: d.email || undefined,
        submittedAt: now().toISOString(),
      });
      return { ok: true, id: doc._id };
    }
    case 'rating': {
      if (!sanity) {
        log('[forms] SANITY_WRITE_TOKEN missing; talk rating not stored');
        return { ok: true, id };
      }
      const target = String(d.target);
      const doc = await sanity.create({
        _type: 'feedback',
        event: { _type: 'reference', _ref: String(d.eventId) },
        // "evening" rates the whole meetup; anything else is a talk document id.
        ...(target === 'evening' ? {} : { talk: { _type: 'reference', _ref: target } }),
        rating: Number(d.stars),
        comment: (d.note as string | undefined) ?? '',
        submittedAt: now().toISOString(),
      });
      return { ok: true, id: doc._id };
    }
    default:
      return { ok: false, error: 'Unknown form' };
  }
}
