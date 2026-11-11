/**
 * CFP drafts and usage counters in Postgres (tables `cfp_drafts` and `cfp_usage`, migration
 * apps/web/database/migrations/20261111120000_cfp_drafts.sql). Every write to a draft names its
 * owner (Slack team and user) in the WHERE clause, so nobody but the person who started a draft can
 * change, claim or delete it, whatever the caller passes.
 *
 * No Sanity here, and nothing from the organiser bot: drafts stay out of the Studio until the
 * person presses Submit.
 */
import type { CfpFields } from './fields.ts';

/** The owner of a draft: from the verified Slack event or button press, never from the model. */
export interface CfpOwner {
  team: string;
  user: string;
}

export interface CfpThread extends CfpOwner {
  channel: string;
  threadTs: string;
}

export interface CfpDraft extends CfpThread {
  id: string;
  fields: CfpFields;
  /** Only from the private email field, when the Slack profile shows none. Never shown to the model. */
  email: string | null;
  /** The answer to "Use your Slack photo on your speaker page?"; null until they choose. */
  photo: boolean | null;
  /** `submitting` while a Submit press is being handled, so a double click cannot send twice. */
  status: 'draft' | 'submitting';
  createdAt: Date;
  updatedAt: Date;
}

export type UsageKind = 'message' | 'submission' | 'model_call';

/** The person already has an open draft in another thread (one open draft per person). */
export class OpenDraftExists extends Error {
  readonly draft: CfpDraft;
  constructor(draft: CfpDraft) {
    super('An open CFP draft exists for this person');
    this.draft = draft;
  }
}

export interface CfpStore {
  byThread(t: Omit<CfpThread, 'user'>): Promise<CfpDraft | null>;
  byId(id: string): Promise<CfpDraft | null>;
  openFor(o: CfpOwner): Promise<CfpDraft | null>;
  /** Starts a draft for this thread. Throws OpenDraftExists when the person has one elsewhere. */
  create(t: CfpThread): Promise<CfpDraft>;
  /** Changes the owner's draft; null when the id is not theirs (or is being submitted). */
  update(id: string, owner: CfpOwner, patch: { fields?: CfpFields; email?: string | null; photo?: boolean | null }): Promise<CfpDraft | null>;
  /** draft → submitting, only for the owner. Null when someone else's, missing or already submitting. */
  claim(id: string, owner: CfpOwner): Promise<CfpDraft | null>;
  /** submitting → draft, after a failed or paused submit. */
  release(id: string, owner: CfpOwner): Promise<void>;
  remove(id: string, owner: CfpOwner): Promise<boolean>;
  /** Deletes drafts untouched for `days` days and usage rows older than two days. */
  purge(days: number): Promise<number>;
  record(kind: UsageKind, team: string, user: string | null, amount?: number): Promise<void>;
  /** Usage since `since`: per person when `user` is given, else for everyone. */
  usage(kind: UsageKind, since: Date, owner?: CfpOwner): Promise<number>;
}

/** What `pg.Pool` offers (structural, so this package needs no database driver). */
export interface Queryable {
  query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
}

interface Row {
  id: string;
  slack_team_id: string;
  slack_user_id: string;
  slack_channel_id: string;
  slack_thread_ts: string;
  fields: CfpFields;
  contact_email: string | null;
  photo_consent: boolean | null;
  status: 'draft' | 'submitting';
  created_at: Date;
  updated_at: Date;
}

const toDraft = (r: Row): CfpDraft => ({
  id: r.id,
  team: r.slack_team_id,
  user: r.slack_user_id,
  channel: r.slack_channel_id,
  threadTs: r.slack_thread_ts,
  fields: r.fields ?? {},
  email: r.contact_email,
  photo: r.photo_consent,
  status: r.status,
  createdAt: new Date(r.created_at),
  updatedAt: new Date(r.updated_at),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function postgresCfpStore(db: Queryable): CfpStore {
  const one = async (sql: string, params: unknown[]) => {
    const { rows } = await db.query<Row>(sql, params);
    return rows[0] ? toDraft(rows[0]) : null;
  };
  const store: CfpStore = {
    byThread: (t) => one(`select * from cfp_drafts where slack_team_id = $1 and slack_channel_id = $2 and slack_thread_ts = $3`, [t.team, t.channel, t.threadTs]),
    byId: async (id) => (UUID.test(id) ? one(`select * from cfp_drafts where id = $1`, [id]) : null),
    openFor: (o) => one(`select * from cfp_drafts where slack_team_id = $1 and slack_user_id = $2`, [o.team, o.user]),
    async create(t) {
      const made = await one(
        `insert into cfp_drafts (slack_team_id, slack_user_id, slack_channel_id, slack_thread_ts)
         values ($1, $2, $3, $4)
         on conflict do nothing
         returning *`,
        [t.team, t.user, t.channel, t.threadTs],
      );
      if (made) return made;
      const mine = await store.openFor(t);
      if (mine && (mine.channel !== t.channel || mine.threadTs !== t.threadTs)) throw new OpenDraftExists(mine);
      if (mine) return mine;
      throw new Error('This thread already holds someone else’s draft');
    },
    update: (id, o, p) =>
      UUID.test(id)
        ? one(
            `update cfp_drafts set
               fields = coalesce($4::jsonb, fields),
               contact_email = case when $5::boolean then $6 else contact_email end,
               photo_consent = case when $7::boolean then $8 else photo_consent end,
               updated_at = now()
             where id = $1 and slack_team_id = $2 and slack_user_id = $3 and status = 'draft'
             returning *`,
            [id, o.team, o.user, p.fields ? JSON.stringify(p.fields) : null, 'email' in p, p.email ?? null, 'photo' in p, p.photo ?? null],
          )
        : Promise.resolve(null),
    claim: (id, o) =>
      UUID.test(id)
        ? one(
            `update cfp_drafts set status = 'submitting', updated_at = now()
             where id = $1 and slack_team_id = $2 and slack_user_id = $3 and status = 'draft' returning *`,
            [id, o.team, o.user],
          )
        : Promise.resolve(null),
    async release(id, o) {
      if (!UUID.test(id)) return;
      await db.query(`update cfp_drafts set status = 'draft' where id = $1 and slack_team_id = $2 and slack_user_id = $3`, [id, o.team, o.user]);
    },
    async remove(id, o) {
      if (!UUID.test(id)) return false;
      const { rows } = await db.query(`delete from cfp_drafts where id = $1 and slack_team_id = $2 and slack_user_id = $3 returning id`, [id, o.team, o.user]);
      return rows.length > 0;
    },
    async purge(days) {
      const { rows } = await db.query(`delete from cfp_drafts where updated_at < now() - make_interval(days => $1) returning id`, [days]);
      await db.query(`delete from cfp_usage where at < now() - interval '2 days'`);
      return rows.length;
    },
    async record(kind, team, user, amount = 1) {
      await db.query(`insert into cfp_usage (kind, slack_team_id, slack_user_id, amount) values ($1, $2, $3, $4)`, [kind, team, user, amount]);
    },
    async usage(kind, since, o) {
      const { rows } = await db.query<{ n: string | number | null }>(
        o
          ? `select coalesce(sum(amount), 0) as n from cfp_usage where kind = $1 and at >= $2 and slack_team_id = $3 and slack_user_id = $4`
          : `select coalesce(sum(amount), 0) as n from cfp_usage where kind = $1 and at >= $2`,
        o ? [kind, since, o.team, o.user] : [kind, since],
      );
      return Number(rows[0]?.n ?? 0);
    },
  };
  return store;
}
