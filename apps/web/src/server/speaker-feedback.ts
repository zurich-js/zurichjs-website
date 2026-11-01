/**
 * Speaker feedback behind a private link (/feedback/speaker/<token>).
 *
 * The token is the JWT production emails to speakers (HS256 with JWT_SECRET,
 * claims `{ speakerId: <speaker id.current>, type: 'speaker-feedback', exp }`).
 * Ratings are Sanity `feedback` documents: production ones reference the
 * speaker, V2 ones (the rating sheet) reference the talk, so both are read.
 */
import type { Env } from './http';
import { verifyHs256 } from './jwt';
import { sanityReadToken } from '@zurichjs/content';
import { groqQuery } from './sanity';

export const INVALID_LINK = 'This link is not valid or has expired.';
export const UNAVAILABLE = 'Feedback can’t be loaded right now. Please try again in a few minutes.';

export interface TalkFeedback {
  key: string;
  title: string;
  eventTitle?: string;
  eventSlug?: string;
  eventDate?: string;
  count: number;
  /** Mean of the ratings, one decimal. Null when no rating has a number. */
  average: number | null;
  /** How many ratings had each star value, index 0 = 1 star. */
  distribution: [number, number, number, number, number];
  comments: { text: string; rating: number | null; submittedAt?: string }[];
}

export interface SpeakerFeedback {
  speaker: { name: string; image?: string };
  total: number;
  average: number | null;
  talks: TalkFeedback[];
}

export type FeedbackResult = { ok: true; data: SpeakerFeedback } | { ok: false; status: 400 | 401 | 502; error: string };

interface RawFeedback {
  _id: string;
  rating?: number | null;
  comment?: string | null;
  submittedAt?: string | null;
  event?: { _id?: string; title?: string; datetime?: string; slug?: string } | null;
  talk?: { _id?: string; title?: string } | null;
}

export const SPEAKER_FEEDBACK_QUERY = `{
  "speaker": *[_type == "speaker" && id.current == $speakerId][0]{ name, "image": image.asset->url },
  "feedback": *[_type == "feedback" && (speaker->id.current == $speakerId || $speakerId in talk->speakers[]->id.current)] | order(submittedAt desc) {
    _id, rating, comment, submittedAt,
    "event": event->{ _id, title, datetime, "slug": id.current },
    "talk": talk->{ _id, title }
  }
}`;

const round1 = (n: number) => Math.round(n * 10) / 10;
const validRating = (r: unknown): r is number => typeof r === 'number' && Number.isFinite(r) && r >= 1 && r <= 5;

/** Groups feedback documents by talk (newest event first). Pure, for tests. */
export function summarise(speaker: { name?: string; image?: string | null }, docs: RawFeedback[]): SpeakerFeedback {
  const byKey = new Map<string, TalkFeedback & { sum: number; rated: number }>();
  for (const d of docs) {
    const key = d.talk?._id ?? (d.event?._id ? `event:${d.event._id}` : 'other');
    let t = byKey.get(key);
    if (!t) {
      t = {
        key,
        title: d.talk?.title ?? (d.event?.title ? `Your talk at ${d.event.title}` : 'Other feedback'),
        eventTitle: d.event?.title,
        eventSlug: d.event?.slug,
        eventDate: d.event?.datetime,
        count: 0,
        average: null,
        distribution: [0, 0, 0, 0, 0],
        comments: [],
        sum: 0,
        rated: 0,
      };
      byKey.set(key, t);
    }
    t.count++;
    const r = validRating(d.rating) ? Math.round(d.rating) : null;
    if (r !== null) {
      t.sum += d.rating as number;
      t.rated++;
      t.distribution[r - 1] = (t.distribution[r - 1] ?? 0) + 1;
    }
    const comment = d.comment?.trim();
    if (comment) t.comments.push({ text: comment, rating: r, submittedAt: d.submittedAt ?? undefined });
  }
  const talks = [...byKey.values()]
    .map(({ sum, rated, ...t }) => ({ ...t, average: rated ? round1(sum / rated) : null }))
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''));
  const rated = docs.filter((d) => validRating(d.rating));
  return {
    speaker: { name: speaker.name || 'Speaker', ...(speaker.image ? { image: speaker.image } : {}) },
    total: docs.length,
    average: rated.length ? round1(rated.reduce((s, d) => s + (d.rating as number), 0) / rated.length) : null,
    talks,
  };
}

export async function loadSpeakerFeedback(token: string, deps: { env?: Env; fetch?: typeof fetch; log?: (m: string) => void; now?: () => number } = {}): Promise<FeedbackResult> {
  const { env = process.env, fetch: fetchImpl = fetch, log = console.log, now = Date.now } = deps;
  if (!token || token.length > 2000) return { ok: false, status: 400, error: INVALID_LINK };
  if (!env.JWT_SECRET) {
    log('[speaker-feedback] JWT_SECRET missing; feedback links cannot be verified');
    return { ok: false, status: 401, error: INVALID_LINK };
  }
  const payload = verifyHs256(token, env.JWT_SECRET, now());
  const speakerId = payload?.speakerId;
  if (typeof speakerId !== 'string' || !speakerId || (payload?.type !== undefined && payload.type !== 'speaker-feedback')) {
    return { ok: false, status: 401, error: INVALID_LINK };
  }
  if (!sanityReadToken(env)) log('[speaker-feedback] SANITY_READ_TOKEN missing; reading feedback without a token (works only if the dataset is public)');
  try {
    const r = await groqQuery(env, fetchImpl)<{ speaker: { name?: string; image?: string | null } | null; feedback: RawFeedback[] | null }>(SPEAKER_FEEDBACK_QUERY, { speakerId });
    if (!r?.speaker) return { ok: false, status: 401, error: INVALID_LINK };
    return { ok: true, data: summarise(r.speaker, r.feedback ?? []) };
  } catch (cause) {
    console.error('[speaker-feedback] Sanity read failed', cause);
    return { ok: false, status: 502, error: UNAVAILABLE };
  }
}
