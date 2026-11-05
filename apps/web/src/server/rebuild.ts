/**
 * Rebuild scheduling for the static site (docs/v2/RUNBOOK.md, "How rebuilds happen").
 *
 * - Sanity publish webhooks (POST /api/rebuild) only record that content changed.
 * - A scheduled function ticks every 2 minutes. It triggers ONE Netlify build once
 *   no publish has arrived for DEBOUNCE_MS (ten quick publishes → one build), and one
 *   build at each event's doors and doors + 48 h, the moments the prerendered HTML
 *   changes state (times come from the deployed site's /state-changes.json).
 *
 * Everything here is pure or takes its I/O as arguments, so it is unit-tested
 * without Netlify. The wiring lives in src/pages/api/rebuild.ts and
 * netlify/functions/scheduled-rebuild.mts.
 */
export const DEBOUNCE_MS = 2 * 60 * 1000;
/** Sanity signs with a millisecond timestamp; older requests are replays. */
export const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

export interface RebuildState {
  /** First publish not yet built. */
  pendingSince?: string;
  /** Most recent publish. */
  lastPublishAt?: string;
  /** State-change times (ISO) that already triggered a build. */
  fired: string[];
  lastBuildAt?: string;
}

/** Netlify Blobs in production; an in-memory object in tests. */
export interface StateStore {
  read(): Promise<RebuildState | null>;
  write(s: RebuildState): Promise<void>;
}

export const emptyState = (): RebuildState => ({ fired: [] });

export function recordPublish(s: RebuildState, now: Date): RebuildState {
  return { ...s, pendingSince: s.pendingSince ?? now.toISOString(), lastPublishAt: now.toISOString() };
}

export interface Decision {
  build: boolean;
  reasons: string[];
  next: RebuildState;
}

/** Called on every scheduled tick. */
export function decide(s: RebuildState, now: Date, changeTimes: string[]): Decision {
  const reasons: string[] = [];
  const next: RebuildState = { ...s, fired: [...s.fired] };
  if (s.pendingSince && s.lastPublishAt && now.getTime() - Date.parse(s.lastPublishAt) >= DEBOUNCE_MS) {
    reasons.push(`content published since ${s.pendingSince}`);
    delete next.pendingSince;
    delete next.lastPublishAt;
  }
  for (const t of changeTimes) {
    if (Date.parse(t) <= now.getTime() && !next.fired.includes(t)) {
      reasons.push(`event state changes at ${t}`);
      next.fired.push(t);
    }
  }
  // Anything older than a week can no longer re-trigger.
  next.fired = next.fired.filter((t) => now.getTime() - Date.parse(t) < 7 * 24 * 3600_000);
  if (reasons.length) next.lastBuildAt = now.toISOString();
  return { build: reasons.length > 0, reasons, next };
}

/**
 * Verifies the `sanity-webhook-signature` header: `t=<ms>,v1=<base64url HMAC-SHA256 of "<t>.<body>">`.
 * Same scheme as @sanity/webhook; rejects signatures older than MAX_SIGNATURE_AGE_MS.
 */
export async function validSanitySignature(header: string | null, body: string, secret: string, now = Date.now()): Promise<boolean> {
  const m = header?.trim().match(/^t=(\d+)[, ]+v1=([^, ]+)$/);
  if (!m) return false;
  const t = Number(m[1]);
  if (Math.abs(now - t) > MAX_SIGNATURE_AGE_MS) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
  const expected = btoa(String.fromCharCode(...sig))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return timingSafeEqual(expected, m[2]!);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const text = (body: string, status: number, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...headers } });

/** POST /api/rebuild: the Sanity publish webhook. Records a pending build; never builds directly. */
export async function acceptPublish(req: Request, secret: string | undefined, store: StateStore, now = new Date()): Promise<Response> {
  if (req.method !== 'POST') return text('Method not allowed', 405, { allow: 'POST' });
  if (!secret) {
    console.error('[rebuild] SANITY_WEBHOOK_SECRET missing; refusing webhook');
    return text('Not configured', 503);
  }
  const body = await req.text();
  if (!(await validSanitySignature(req.headers.get('sanity-webhook-signature'), body, secret, now.getTime()))) return text('Invalid signature', 401);
  await store.write(recordPublish((await store.read()) ?? emptyState(), now));
  return Response.json({ ok: true, queued: true });
}

export interface TickDeps {
  store: StateStore;
  /** Fetches the deployed site's /state-changes.json times; [] when unavailable. */
  changeTimes: () => Promise<string[]>;
  /** POSTs the Netlify build hook; undefined when NETLIFY_BUILD_HOOK_URL is not set. */
  triggerBuild?: (title: string) => Promise<void>;
  now?: Date;
  log?: (msg: string) => void;
}

/** One scheduled tick. Returns the reasons it built for (empty when it did not). */
export async function tick({ store, changeTimes, triggerBuild, now = new Date(), log = console.log }: TickDeps): Promise<string[]> {
  const d = decide((await store.read()) ?? emptyState(), now, await changeTimes());
  if (!d.build) return [];
  if (!triggerBuild) {
    log(`[rebuild] would build (${d.reasons.join('; ')}) but NETLIFY_BUILD_HOOK_URL is missing`);
    return [];
  }
  await triggerBuild(`Scheduled: ${d.reasons.join('; ')}`.slice(0, 200));
  // Only remember the decision once the build hook accepted it, so a failed hook retries next tick.
  await store.write(d.next);
  log(`[rebuild] triggered: ${d.reasons.join('; ')}`);
  return d.reasons;
}
