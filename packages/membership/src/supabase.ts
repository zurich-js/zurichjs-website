/**
 * The member store on Supabase, over PostgREST with plain fetch (no SDK, like
 * apps/web/src/server/stripe.ts). Server-side only: it uses the service role,
 * which bypasses RLS. Writes go through the member_* SQL functions in
 * supabase/migrations, so status and audit row are one transaction.
 *
 * Environment:
 *   SUPABASE_URL               https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  functions and scripts only; never PUBLIC_, never in a browser bundle
 */
import { checkTransition, TransitionError } from './state.ts';
import { DuplicateEmail, MemberNotFound, normaliseEmail, type MemberStore } from './store.ts';
import type { Actor, Member, MemberEvent, MemberPatch, NewMember } from './types.ts';

type Env = Record<string, string | undefined>;
type Fetch = typeof fetch;

export class SupabaseUnavailable extends Error {}

export interface MemberRow {
  id: string;
  auth_user_id: string | null;
  email: string;
  kind: Member['kind'];
  name: string;
  organisation_name: string | null;
  level: Member['level'];
  cycle: Member['cycle'];
  category: Member['category'];
  status: Member['status'];
  ended_reason: Member['endedReason'];
  source: Member['source'];
  joined_at: string | null;
  paid_until: string | null;
  payment_mode: Member['paymentMode'];
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: number;
  member_id: string;
  type: string;
  from_status: MemberEvent['fromStatus'];
  to_status: MemberEvent['toStatus'];
  actor_kind: Actor['kind'];
  actor_id: string;
  payload: Record<string, unknown>;
  at: string;
}

export const fromRow = (r: MemberRow): Member => ({
  id: r.id,
  authUserId: r.auth_user_id,
  email: r.email,
  kind: r.kind,
  name: r.name,
  organisationName: r.organisation_name,
  level: r.level,
  cycle: r.cycle,
  category: r.category,
  status: r.status,
  endedReason: r.ended_reason,
  source: r.source,
  joinedAt: r.joined_at,
  paidUntil: r.paid_until,
  paymentMode: r.payment_mode,
  stripeCustomerId: r.stripe_customer_id,
  stripeSubscriptionId: r.stripe_subscription_id,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const PATCH_COLUMNS: Record<keyof MemberPatch, string> = {
  authUserId: 'auth_user_id',
  kind: 'kind',
  name: 'name',
  organisationName: 'organisation_name',
  level: 'level',
  cycle: 'cycle',
  category: 'category',
  paidUntil: 'paid_until',
  paymentMode: 'payment_mode',
  notes: 'notes',
  joinedAt: 'joined_at',
};

export const toPatchRow = (patch: MemberPatch): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(patch)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [PATCH_COLUMNS[k as keyof MemberPatch], v]),
  );

export function supabaseConfig(env: Env): { url: string; key: string } {
  const url = env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new SupabaseUnavailable('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
  if (!/^https:\/\/[^\s/]+$/.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url))
    throw new SupabaseUnavailable('SUPABASE_URL must be https://<project>.supabase.co');
  return { url, key };
}

/** A PostgREST error, mapped to the store's errors where there is one. */
function toError(status: number, body: { code?: string; message?: string; details?: string }): Error {
  const msg = body.message ?? '';
  if (msg.includes('member_transition_conflict')) return new TransitionError('The membership changed in the meantime. Look again.', 'conflict');
  if (body.code === '23505' && /email/.test(`${msg} ${body.details ?? ''}`)) return new DuplicateEmail('that email');
  if (body.code === 'P0002') return new MemberNotFound('');
  return new Error(`Supabase HTTP ${status}${body.code ? ` ${body.code}` : ''}: ${msg}`.trim());
}

export function supabaseStore(env: Env, fetchImpl: Fetch = fetch): MemberStore {
  const { url, key } = supabaseConfig(env);

  async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const res = await fetchImpl(`${url}/rest/v1/${path}`, {
      method,
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as T & { code?: string; message?: string };
    if (!res.ok) throw toError(res.status, json);
    return json;
  }

  const one = async (filter: string): Promise<Member | null> => {
    const rows = await call<MemberRow[]>('GET', `members?select=*&${filter}&limit=1`);
    return rows[0] ? fromRow(rows[0]) : null;
  };

  const rpc = async (fn: string, args: Record<string, unknown>) => fromRow(await call<MemberRow>('POST', `rpc/${fn}`, args));

  return {
    get: (id) => one(`id=eq.${encodeURIComponent(id)}`),
    byEmail: (email) => one(`email=eq.${encodeURIComponent(normaliseEmail(email))}`),
    byAuthUser: (uid) => one(`auth_user_id=eq.${encodeURIComponent(uid)}`),
    byStripeSubscription: (sid) => one(`stripe_subscription_id=eq.${encodeURIComponent(sid)}`),
    byStatus: async (status) => (await call<MemberRow[]>('GET', `members?select=*&status=eq.${encodeURIComponent(status)}&order=created_at.asc&limit=200`)).map(fromRow),
    create: (m: NewMember, actor) =>
      rpc('member_create', {
        p_member: {
          email: normaliseEmail(m.email),
          kind: m.kind,
          name: m.name,
          organisation_name: m.organisationName,
          level: m.level,
          cycle: m.cycle,
          category: m.category,
          status: m.status,
          source: m.source,
          joined_at: m.joinedAt,
          paid_until: m.paidUntil,
          payment_mode: m.paymentMode,
          notes: m.notes,
          auth_user_id: m.authUserId ?? null,
        },
        p_actor_kind: actor.kind,
        p_actor_id: actor.id,
      }),
    update: (id, patch, actor) => rpc('member_update', { p_id: id, p_patch: toPatchRow(patch), p_actor_kind: actor.kind, p_actor_id: actor.id }),
    linkStripe: (id, ids, actor) =>
      rpc('member_link_stripe', { p_id: id, p_customer_id: ids.customerId ?? null, p_subscription_id: ids.subscriptionId ?? null, p_actor_kind: actor.kind, p_actor_id: actor.id }),
    async transition(id, input) {
      const current = await one(`id=eq.${encodeURIComponent(id)}`);
      if (!current) throw new MemberNotFound(id);
      if (input.from && current.status !== input.from) throw new TransitionError('The membership changed in the meantime. Look again.', 'conflict');
      const t = checkTransition(current, input.to, input.actor.kind, input.reason);
      return rpc('member_transition', {
        p_id: id,
        p_from: t.from,
        p_to: t.to,
        p_ended_reason: t.endedReason,
        p_actor_kind: input.actor.kind,
        p_actor_id: input.actor.id,
        p_payload: input.payload ?? {},
      });
    },
    async events(id) {
      const rows = await call<EventRow[]>('GET', `member_events?select=*&member_id=eq.${encodeURIComponent(id)}&order=at.asc,id.asc`);
      return rows.map((r) => ({
        id: String(r.id),
        memberId: r.member_id,
        type: r.type,
        fromStatus: r.from_status,
        toStatus: r.to_status,
        actor: { kind: r.actor_kind, id: r.actor_id },
        payload: r.payload,
        at: r.at,
      }));
    },
  };
}

/** Uploads a file to a private bucket with the service role. Refuses to overwrite. */
export async function uploadPrivate(
  env: Env,
  bucket: 'declarations' | 'member-documents',
  path: string,
  bytes: Uint8Array<ArrayBuffer>,
  contentType: string,
  fetchImpl: Fetch = fetch,
): Promise<void> {
  const { url, key } = supabaseConfig(env);
  if (!/^[a-z0-9][a-z0-9/_.-]{0,200}$/.test(path) || path.includes('..')) throw new Error(`Bad storage path: ${path}`);
  const res = await fetchImpl(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': contentType, 'x-upsert': 'false' },
    body: bytes,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Supabase Storage HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export interface DeclarationInput {
  memberId: string;
  kind: 'digital' | 'paper_import';
  versionId: string | null;
  signedAt: string;
  typedName: string | null;
  ip: string | null;
  userAgent: string | null;
  sha256: string;
  storagePath: string;
}

/** Records a declaration (the file must already be in the `declarations` bucket). */
export async function insertDeclaration(env: Env, d: DeclarationInput, fetchImpl: Fetch = fetch): Promise<void> {
  const { url, key } = supabaseConfig(env);
  const res = await fetchImpl(`${url}/rest/v1/declarations`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({
      member_id: d.memberId,
      kind: d.kind,
      version_id: d.versionId,
      signed_at: d.signedAt,
      typed_name: d.typedName,
      ip: d.ip,
      user_agent: d.userAgent,
      sha256: d.sha256,
      storage_path: d.storagePath,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw toError(res.status, (await res.json().catch(() => ({}))) as { code?: string; message?: string });
}
