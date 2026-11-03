import type { AwardRecord, ConferenceCopy, ConferenceState, Event, Milestone, Partner, Quote, RatingRecord, Speaker, TeamMember } from '@zurichjs/events';
import {
  mapEvent,
  mapPartner,
  mapRating,
  mapSpeaker,
  mapSupport,
  visibleSpeakers,
  type RawEvent,
  type RawPartner,
  type RawSingletons,
  type RawSpeaker,
  type SupportInfo,
} from './map.ts';
import { EVENTS_QUERY, PARTNERS_QUERY, SINGLETONS_QUERY, SPEAKERS_QUERY } from './queries.ts';
import { MILESTONES, TEAM, VOLUNTEERS } from './community.ts';
import { withPartnerFallback } from './partners.ts';
import { loadMedia, MediaUnavailableError, type MediaCollection } from './media.ts';
import * as sample from './sample.ts';

export * from './map.ts';
export * from './media.ts';
export * from './queries.ts';
export * from './partners.ts';
export { PHOTOS, SITE } from './sample.ts';
export { SPEAKER_COMPANIES, SPEAKER_PROGRAMMES, type SpeakerCompany } from './community.ts';

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
  /** First names and surnames of volunteers to thank (ZurichJS Conf 2026). */
  volunteers: string[];
  milestones: Milestone[];
  quotes: Quote[];
  /** One-off contributions on /donate. */
  support: SupportInfo;
  /** Site settings editors change without a deploy. */
  settings: SiteSettings;
  /** Photos and videos from events (ImageKit and Sanity). */
  media: MediaCollection;
}

export interface SiteSettings {
  /** A verified Slack invite, or undefined: the site then offers "Ask us for a Slack invite". */
  slackInviteUrl?: string;
  /** ImageKit folder of the conference photos (the conference collection on /media). */
  conferenceMediaFolder?: string;
}

/**
 * Only a complete invite link counts. The old site shipped a truncated one
 * (".../shared_invite/" with no token), which opens Slack's error page.
 */
export function validSlackInvite(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return undefined;
    if (u.hostname === 'join.slack.com') return /^\/t\/[^/]+\/shared_invite\/[A-Za-z0-9_-]{8,}/.test(u.pathname) ? url : undefined;
    return url;
  } catch {
    return undefined;
  }
}

/** The Slack call to action: the invite when one is set, otherwise a way to ask for one. */
export function slackLink(settings: SiteSettings): { href: string; label: string; external: boolean } {
  const invite = validSlackInvite(settings.slackInviteUrl);
  return invite ? { href: invite, label: 'Join our Slack', external: true } : { href: '/contact?topic=slack', label: 'Ask us for a Slack invite', external: false };
}

type Env = Record<string, string | undefined>;

export type Perspective = 'published' | 'drafts';

/** Read token. SANITY_TOKEN is the production site's existing variable (one token for reads and writes). */
export const sanityReadToken = (env: Env) => env.SANITY_READ_TOKEN || env.SANITY_TOKEN || undefined;

/**
 * `SANITY_PERSPECTIVE=drafts` builds the draft preview site (unpublished changes
 * win). It needs a read token: drafts are private. Anything else means published.
 */
export function perspective(env: Env): Perspective {
  if (env.SANITY_PERSPECTIVE !== 'drafts') return 'published';
  if (!sanityReadToken(env)) throw new Error('SANITY_PERSPECTIVE=drafts needs SANITY_READ_TOKEN (a Viewer token): drafts are not public.');
  return 'drafts';
}

/** True for draft preview builds: they must never be indexed (see BaseLayout and robots.txt). */
export const isPreview = (env: Env = process.env) => env.SANITY_PERSPECTIVE === 'drafts';

export const sanityConfig = (env: Env) => ({
  projectId: env.SANITY_PROJECT_ID ?? 'viqjrovw',
  dataset: env.SANITY_DATASET ?? 'production',
  apiVersion: '2026-10-01',
  token: sanityReadToken(env),
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
    team: TEAM,
    volunteers: VOLUNTEERS,
    milestones: MILESTONES,
    quotes: sample.QUOTES,
    // Never a sample payment code: the Twint QR only ever comes from Sanity.
    support: {},
    // No sample Slack invite either: an unverified link would ship.
    settings: {},
    media: { items: sample.MEDIA, imagekit: 'sample' },
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
  // Until Sanity has partner documents, production's sourced partner list (partners.ts) is used.
  const withPartners = withPartnerFallback(partners.map(mapPartner), events.map(mapEvent));
  const mappedEvents = withPartners.events;
  return {
    source: 'sanity',
    events: mappedEvents,
    speakers: visibleSpeakers(speakers).map(mapSpeaker),
    partners: withPartners.partners,
    // Until the meetupRating singleton exists (Phase 3), keep the sourced record from the design handoff.
    rating: singletons.rating ? mapRating(singletons.rating) : fallback.rating,
    award: fallback.award,
    conference:
      conf?.state && conf.headline
        ? { state: conf.state, copy: { headline: conf.headline, body: conf.body ?? '', cta: conf.cta ?? '', cfp: conf.cfp ?? '' }, url: conf.url ?? sample.SITE.confUrl }
        : fallback.conference,
    team: TEAM,
    volunteers: VOLUNTEERS,
    milestones: MILESTONES,
    quotes: fallback.quotes,
    support: mapSupport(singletons.support),
    settings: {
      slackInviteUrl: validSlackInvite(singletons.site?.slackInviteUrl),
      conferenceMediaFolder: singletons.site?.conferenceMediaFolder ?? undefined,
    },
    media: await loadMedia(env, mappedEvents, { collections: [singletons.site?.conferenceMediaFolder ?? undefined] }),
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
 * - The ImageKit photo archive (media.ts) is required on production deploys
 *   (or with `MEDIA_REQUIRE_IMAGEKIT=1`): without the key, or when the listing
 *   fails, the build fails. Elsewhere it continues and pages say the archive
 *   is unavailable.
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
      // A build that needs the photo archive and cannot read it fails too (sample content would not help).
      if (err instanceof MediaUnavailableError || env.CONTEXT === 'production' || env.CONTENT_REQUIRE_SANITY === '1') throw err;
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
