import type { AwardRecord, ConferenceCopy, ConferenceState, Event, Milestone, Partner, Quote, RatingRecord, Speaker, TeamMember } from '@zurichjs/events';
import { mapEvent, mapPartner, mapRating, mapSpeaker, mapSupport, type RawEvent, type RawPartner, type RawSingletons, type RawSpeaker, type SupportInfo } from './map';
import { EVENTS_QUERY, PARTNERS_QUERY, SINGLETONS_QUERY, SPEAKERS_QUERY } from './queries';
import * as sample from './sample';

export * from './map';
export * from './queries';
export { PHOTOS, SITE } from './sample';

export interface SiteContent {
  /** Where the content came from. "sample" is placeholder content and must never ship to production. */
  source: 'sanity' | 'sample';
  events: Event[];
  speakers: Speaker[];
  partners: Partner[];
  rating: RatingRecord | null;
  award: AwardRecord;
  conference: { state: ConferenceState; copy: ConferenceCopy; url: string };
  team: TeamMember[];
  milestones: Milestone[];
  quotes: Quote[];
  /** One-off contributions on /donate. */
  support: SupportInfo;
}

type Env = Record<string, string | undefined>;

export type Perspective = 'published' | 'drafts';

/**
 * `SANITY_PERSPECTIVE=drafts` builds the draft preview site (unpublished changes
 * win). It needs a read token: drafts are private. Anything else means published.
 */
export function perspective(env: Env): Perspective {
  if (env.SANITY_PERSPECTIVE !== 'drafts') return 'published';
  if (!env.SANITY_READ_TOKEN) throw new Error('SANITY_PERSPECTIVE=drafts needs SANITY_READ_TOKEN (a Viewer token): drafts are not public.');
  return 'drafts';
}

/** True for draft preview builds: they must never be indexed (see BaseLayout and robots.txt). */
export const isPreview = (env: Env = process.env) => env.SANITY_PERSPECTIVE === 'drafts';

export const sanityConfig = (env: Env) => ({
  projectId: env.SANITY_PROJECT_ID ?? 'viqjrovw',
  dataset: env.SANITY_DATASET ?? 'production',
  apiVersion: '2026-10-01',
  token: env.SANITY_READ_TOKEN || undefined,
  perspective: perspective(env),
});

/**
 * Minimal GROQ client over the HTTP query API (published documents, or drafts
 * for the preview build).
 * Plain fetch keeps the package dependency-free and makes network failures
 * catchable, so the build can fall back or fail cleanly.
 */
export function groq(env: Env) {
  const { projectId, dataset, apiVersion, token, perspective } = sanityConfig(env);
  return async function fetchQuery<T>(query: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`);
    url.searchParams.set('query', query);
    url.searchParams.set('perspective', perspective);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(`$${k}`, JSON.stringify(v));
    const res = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`Sanity query failed: HTTP ${res.status}`);
    return ((await res.json()) as { result: T }).result;
  };
}

function sampleContent(): SiteContent {
  return {
    source: 'sample',
    events: sample.EVENTS,
    speakers: sample.SPEAKERS,
    partners: sample.PARTNERS,
    rating: sample.RATING.score ? sample.RATING : null,
    award: sample.AWARD,
    conference: { state: sample.CONFERENCE_STATE, copy: sample.CONFERENCE[sample.CONFERENCE_STATE], url: sample.SITE.confUrl },
    team: sample.TEAM,
    milestones: sample.MILESTONES,
    quotes: sample.QUOTES,
    // Never a sample payment code: the Twint QR only ever comes from Sanity.
    support: {},
  };
}

async function sanityContent(env: Env): Promise<SiteContent> {
  const fetchQuery = groq(env);
  const [events, speakers, partners, singletons] = await Promise.all([
    fetchQuery<RawEvent[]>(EVENTS_QUERY),
    fetchQuery<RawSpeaker[]>(SPEAKERS_QUERY),
    fetchQuery<RawPartner[]>(PARTNERS_QUERY),
    fetchQuery<RawSingletons>(SINGLETONS_QUERY),
  ]);
  const fallback = sampleContent();
  const conf = singletons.conference;
  return {
    source: 'sanity',
    events: events.map(mapEvent),
    speakers: speakers.map(mapSpeaker),
    partners: partners.map(mapPartner),
    // Until the meetupRating singleton exists (Phase 3), keep the sourced record from the design handoff.
    rating: singletons.rating ? mapRating(singletons.rating) : fallback.rating,
    award: fallback.award,
    conference:
      conf?.state && conf.headline
        ? { state: conf.state, copy: { headline: conf.headline, body: conf.body ?? '', cta: conf.cta ?? '', cfp: conf.cfp ?? '' }, url: conf.url ?? sample.SITE.confUrl }
        : fallback.conference,
    team: fallback.team,
    milestones: fallback.milestones,
    quotes: fallback.quotes,
    support: mapSupport(singletons.support),
  };
}

let cached: Promise<SiteContent> | undefined;

/**
 * Loads all public content once per build.
 *
 * - `CONTENT_SOURCE=sample` forces the sample content (tests, visual regression).
 * - Otherwise Sanity is read. If that fails, the build falls back to sample
 *   content with a loud warning, EXCEPT on Netlify production deploys
 *   (`CONTEXT=production`) or when `CONTENT_REQUIRE_SANITY=1`, where it fails.
 * - `SANITY_PERSPECTIVE=drafts` reads drafts (preview site) and requires
 *   `SANITY_READ_TOKEN`; without it the build fails.
 */
export function loadContent(env: Env = process.env, fetchSanity: (env: Env) => Promise<SiteContent> = sanityContent): Promise<SiteContent> {
  cached ??= (async () => {
    if (env.CONTENT_SOURCE === 'sample') return sampleContent();
    // A misconfigured preview build fails loudly instead of falling back to sample content.
    perspective(env);
    try {
      return await fetchSanity(env);
    } catch (err) {
      if (env.CONTEXT === 'production' || env.CONTENT_REQUIRE_SANITY === '1') throw err;
      console.warn(`\n[content] Sanity is not reachable (${(err as Error).message}). USING SAMPLE CONTENT. Do not deploy this build.\n`);
      return sampleContent();
    }
  })();
  return cached;
}

/** For tests. */
export const resetContentCache = () => {
  cached = undefined;
};
