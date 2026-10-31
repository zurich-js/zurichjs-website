import type { AwardRecord, ConferenceCopy, ConferenceState, Event, Milestone, Partner, Quote, RatingRecord, Speaker, TeamMember } from '@zurichjs/events';
import { mapEvent, mapPartner, mapSpeaker, type RawEvent, type RawSpeaker } from './map';
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
}

type Env = Record<string, string | undefined>;

export const sanityConfig = (env: Env) => ({
  projectId: env.SANITY_PROJECT_ID ?? 'viqjrovw',
  dataset: env.SANITY_DATASET ?? 'production',
  apiVersion: '2026-10-01',
  token: env.SANITY_READ_TOKEN || undefined,
});

/**
 * Minimal GROQ client over the HTTP query API (published documents only).
 * Plain fetch keeps the package dependency-free and makes network failures
 * catchable, so the build can fall back or fail cleanly.
 */
export function groq(env: Env) {
  const { projectId, dataset, apiVersion, token } = sanityConfig(env);
  return async function fetchQuery<T>(query: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}`);
    url.searchParams.set('query', query);
    url.searchParams.set('perspective', 'published');
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
  };
}

async function sanityContent(env: Env): Promise<SiteContent> {
  const fetchQuery = groq(env);
  const [events, speakers, partners, singletons] = await Promise.all([
    fetchQuery<RawEvent[]>(EVENTS_QUERY),
    fetchQuery<RawSpeaker[]>(SPEAKERS_QUERY),
    fetchQuery<{ id: string; name?: string; url?: string; logo?: string }[]>(PARTNERS_QUERY),
    fetchQuery<{ rating?: RatingRecord | null; conference?: (Partial<ConferenceCopy> & { state?: ConferenceState; url?: string }) | null }>(SINGLETONS_QUERY),
  ]);
  const fallback = sampleContent();
  const conf = singletons.conference;
  return {
    source: 'sanity',
    events: events.map(mapEvent),
    speakers: speakers.map(mapSpeaker),
    partners: partners.map(mapPartner),
    // Until the meetupRating singleton exists (Phase 3), keep the sourced record from the design handoff.
    rating: singletons.rating ? (singletons.rating.score ? singletons.rating : null) : fallback.rating,
    award: fallback.award,
    conference:
      conf?.state && conf.headline
        ? { state: conf.state, copy: { headline: conf.headline, body: conf.body ?? '', cta: conf.cta ?? '', cfp: conf.cfp ?? '' }, url: conf.url ?? sample.SITE.confUrl }
        : fallback.conference,
    team: fallback.team,
    milestones: fallback.milestones,
    quotes: fallback.quotes,
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
 */
export function loadContent(env: Env = process.env, fetchSanity: (env: Env) => Promise<SiteContent> = sanityContent): Promise<SiteContent> {
  cached ??= (async () => {
    if (env.CONTENT_SOURCE === 'sample') return sampleContent();
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
