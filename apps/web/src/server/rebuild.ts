/**
 * Rebuild scheduling for the static site (docs/systems/operations/rebuilds.md).
 *
 * - Sanity publish webhooks (POST /api/rebuild) only record that content changed.
 * - A scheduled function ticks every 2 minutes. It triggers ONE Netlify build once
 *   no publish has arrived for DEBOUNCE_MS (ten quick publishes → one build), or once
 *   the oldest unbuilt publish is MAX_WAIT_MS old (steady publishing still gets built),
 *   and one build at each event's doors and doors + 48 h, the moments the prerendered
 *   HTML changes state (times come from the deployed site's /state-changes.json).
 * - A publish (Sanity or a sponsorship change) is recorded with StateStore.publish, a write of
 *   its own that no other writer can make fail; the next read or update counts it into the
 *   state (absorb). The tick saves through StateStore.update, which applies a change to the
 *   state as it is when written. It calls the build hook between its read and its write, so
 *   what it saves afterwards (settle) is merged into the current state: a publish counted
 *   after its read stays pending, and fired times and the last build time are kept.
 *   Nothing reserves a decision before the hook: two ticks that reach the same decision
 *   (an invocation started twice, or one delayed past the next) both call it.
 *
 * Everything here is pure or takes its I/O as arguments, so it is unit-tested
 * without Netlify. The wiring lives in src/pages/api/rebuild.ts and
 * netlify/functions/scheduled-rebuild.mts.
 */
export const DEBOUNCE_MS = 2 * 60 * 1000;
/** Publishing that never pauses for DEBOUNCE_MS is built anyway once its first publish is this old. */
export const MAX_WAIT_MS = 15 * 60 * 1000;
/** Sanity signs with a millisecond timestamp; older requests are replays. */
export const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

export interface RebuildState {
  /** First publish not yet built. */
  pendingSince?: string;
  /** Most recent publish. */
  lastPublishAt?: string;
  /** Publishes recorded so far; tells two publishes in the same millisecond apart. */
  publishes?: number;
  /** State-change times (ISO) that already triggered a build. */
  fired: string[];
  lastBuildAt?: string;
  /** Publish records (StateStore.publish) already counted, while they still exist. */
  absorbed?: string[];
}

/** Netlify Blobs in production (rebuild-store.ts); an in-memory object in tests. */
export interface StateStore {
  read(): Promise<RebuildState | null>;
  /** Records a publish at `at`. Never conditional, so no other writer can make it fail. */
  publish(at: Date): Promise<void>;
  /** Saves `change` applied to the stored state; when another writer saved first, applies it again to theirs. */
  update(change: (s: RebuildState) => RebuildState): Promise<RebuildState>;
}

export const emptyState = (): RebuildState => ({ fired: [] });

export function recordPublish(s: RebuildState, now: Date): RebuildState {
  return { ...s, pendingSince: s.pendingSince ?? now.toISOString(), lastPublishAt: now.toISOString(), publishes: (s.publishes ?? 0) + 1 };
}

/** A publish record's key carries its time: `publish/<ISO time>/<unique id>`. */
export const PUBLISH_PREFIX = 'publish/';
export const publishKey = (at: Date, id: string) => `${PUBLISH_PREFIX}${at.toISOString()}/${id}`;

/**
 * `s` with the publish records `keys` counted in, each once: records not counted yet are
 * recorded as publishes at their own time, and `absorbed` keeps the keys of those that still exist.
 */
export function absorb(s: RebuildState, keys: string[]): RebuildState {
  const counted = new Set(s.absorbed ?? []);
  const fresh = keys.filter((k) => !counted.has(k)).sort();
  let next = s;
  for (const k of fresh) {
    const at = k.slice(PUBLISH_PREFIX.length).split('/')[0]!;
    const latest = next.lastPublishAt && next.lastPublishAt > at ? next.lastPublishAt : at;
    next = { ...recordPublish(next, new Date(at)), lastPublishAt: latest };
  }
  const absorbed = [...keys.filter((k) => counted.has(k)), ...fresh];
  const { absorbed: _, ...rest } = next;
  return absorbed.length ? { ...rest, absorbed } : rest;
}

export interface Decision {
  build: boolean;
  reasons: string[];
  next: RebuildState;
}

/** Fired times older than a week can no longer re-trigger. */
const recent = (fired: string[], now: number) => fired.filter((t) => now - Date.parse(t) < 7 * 24 * 3600_000);

/** Called on every scheduled tick. */
export function decide(s: RebuildState, now: Date, changeTimes: string[]): Decision {
  const reasons: string[] = [];
  const next: RebuildState = { ...s, fired: [...s.fired] };
  if (s.pendingSince && s.lastPublishAt) {
    const quiet = now.getTime() - Date.parse(s.lastPublishAt) >= DEBOUNCE_MS;
    const overdue = now.getTime() - Date.parse(s.pendingSince) >= MAX_WAIT_MS;
    if (quiet || overdue) {
      reasons.push(`content published since ${s.pendingSince}${quiet ? '' : ' (still publishing)'}`);
      delete next.pendingSince;
      delete next.lastPublishAt;
    }
  }
  for (const t of changeTimes) {
    if (Date.parse(t) <= now.getTime() && !next.fired.includes(t)) {
      reasons.push(`event state changes at ${t}`);
      next.fired.push(t);
    }
  }
  next.fired = recent(next.fired, now.getTime());
  if (reasons.length) next.lastBuildAt = now.toISOString();
  return { build: reasons.length > 0, reasons, next };
}

/**
 * The state to save once the build hook accepted `d`, which was decided from `seen`, merged into
 * `current`, the state as it is now. Publishes counted after `seen` stay pending, from the time
 * of the decision (none of them can be older). Fired times are the union, less those a week older
 * than the later build time, and the last build time is the later one, so a tick that finishes
 * after a newer one takes nothing back.
 */
export function settle(current: RebuildState, seen: RebuildState, d: Decision): RebuildState {
  const latest = [current.lastBuildAt, d.next.lastBuildAt]
    .filter((t): t is string => !!t)
    .sort()
    .at(-1);
  const fired = [...new Set([...current.fired, ...d.next.fired])];
  const next: RebuildState = { ...current, fired: latest ? recent(fired, Date.parse(latest)) : fired, ...(latest ? { lastBuildAt: latest } : {}) };
  if (seen.pendingSince && !d.next.pendingSince) {
    delete next.pendingSince;
    delete next.lastPublishAt;
    if ((current.publishes ?? 0) > (seen.publishes ?? 0) && current.lastPublishAt) {
      next.pendingSince = d.next.lastBuildAt ?? current.lastPublishAt;
      next.lastPublishAt = current.lastPublishAt;
    }
  }
  return next;
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
  await store.publish(now);
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
  const seen = (await store.read()) ?? emptyState();
  const d = decide(seen, now, await changeTimes());
  if (!d.build) return [];
  if (!triggerBuild) {
    log(`[rebuild] would build (${d.reasons.join('; ')}) but NETLIFY_BUILD_HOOK_URL is missing`);
    return [];
  }
  await triggerBuild(`Scheduled: ${d.reasons.join('; ')}`.slice(0, 200));
  // Only remember the decision once the build hook accepted it, so a failed hook retries next tick.
  await store.update((current) => settle(current, seen, d));
  log(`[rebuild] triggered: ${d.reasons.join('; ')}`);
  return d.reasons;
}
