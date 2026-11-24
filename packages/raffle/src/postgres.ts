/**
 * The raffle store on Postgres. Each write is one statement: a data-modifying CTE changes the row
 * and appends the audit row. Stage and funding changes are compare-and-set.
 */
import { GUARDED_STAGES, RaffleRuleError, checkFunding, checkStage } from './rules.ts';
import { RaffleNotFound, conflict, drawOrder, entriesHash, readyBlocker, type RaffleStore } from './store.ts';
import type { Actor, Consent, Draw, Entry, LedgerEntry, Raffle, RaffleEvent, Share, ShareField } from './types.ts';

export interface Queryable {
  query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
}

type Row = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (v: unknown) => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());
/** pg returns `date` columns as Date at local midnight; keep YYYY-MM-DD. */
const day = (v: unknown) => {
  if (typeof v === 'string') return v.slice(0, 10);
  const d = v as Date;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const raffleOf = (r: Row): Raffle => ({
  id: r.id as string,
  sponsorId: r.sponsor_id as string,
  eventId: r.event_id as string,
  eventTitle: r.event_title as string,
  eventDate: day(r.event_date),
  prize: r.prize as string,
  quantity: Number(r.quantity),
  budgetMinor: Number(r.budget_minor),
  fulfilment: r.fulfilment as Raffle['fulfilment'],
  stage: r.stage as Raffle['stage'],
  funding: r.funding as Raffle['funding'],
  flags: (r.flags as Raffle['flags']) ?? [],
  amountMinor: r.amount_minor === null ? null : Number(r.amount_minor),
  quoteId: (r.quote_id as string | null) ?? null,
  termsVersion: (r.terms_version as string | null) ?? null,
  acceptedVersion: (r.accepted_version as string | null) ?? null,
  acceptedBy: (r.accepted_by as string | null) ?? null,
  acceptedAt: iso(r.accepted_at),
  paymentLinkId: (r.payment_link_id as string | null) ?? null,
  paymentLinkUrl: (r.payment_link_url as string | null) ?? null,
  reason: (r.reason as string | null) ?? null,
  rulesVersion: (r.rules_version as string | null) ?? null,
  rulesUrl: (r.rules_url as string | null) ?? null,
  openedAt: iso(r.opened_at),
  heldFrom: (r.held_from as Raffle['stage']) ?? null,
  closesAt: iso(r.closes_at),
  sharePurpose: (r.share_purpose as string | null) ?? null,
  sharePrivacyUrl: (r.share_privacy_url as string | null) ?? null,
  retentionDays: r.retention_days == null ? null : Number(r.retention_days),
  noticeUrl: r.notice_url as string | null,
  eraseAfter: iso(r.erase_after),
  erasedAt: iso(r.erased_at),
  sharingVersion: (r.sharing_version as string | null) ?? null,
  createdAt: iso(r.created_at)!,
  updatedAt: iso(r.updated_at)!,
});

const ledgerOf = (r: Row): LedgerEntry => ({
  id: String(r.id),
  raffleId: r.raffle_id as string,
  kind: r.kind as LedgerEntry['kind'],
  amountMinor: Number(r.amount_minor),
  note: r.note as string,
  reference: (r.reference as string | null) ?? null,
  actor: { kind: r.actor_kind as Actor['kind'], id: r.actor_id as string },
  at: iso(r.at)!,
});

const entryOf = (r: Row): Entry => ({
  id: r.id as string,
  raffleId: r.raffle_id as string,
  name: r.name as string,
  email: r.email as string,
  claimCode: r.claim_code as string,
  emailVerifiedAt: iso(r.email_verified_at),
  createdAt: iso(r.created_at)!,
});

const drawOf = (r: Row): Draw => ({
  raffleId: r.raffle_id as string,
  seq: Number(r.seq),
  entryId: r.entry_id as string,
  eligibleCount: Number(r.eligible_count),
  entriesHash: r.entries_hash as string,
  index: Number(r.index),
  reason: (r.reason as string | null) ?? null,
  actor: { kind: r.actor_kind as Actor['kind'], id: r.actor_id as string },
  at: iso(r.at)!,
});

const consentOf = (r: Row): Consent => ({
  id: r.id as string,
  entryId: r.entry_id as string,
  raffleId: r.raffle_id as string,
  recipientSponsorId: r.recipient_sponsor_id as string,
  purpose: r.purpose as string,
  version: r.version as string,
  givenAt: iso(r.given_at)!,
  verifiedAt: iso(r.verified_at),
  withdrawnAt: iso(r.withdrawn_at),
});

const shareOf = (r: Row): Share => ({
  id: r.id as string,
  raffleId: r.raffle_id as string,
  recipientContactId: r.recipient_contact_id as string,
  purpose: r.purpose as string,
  fields: r.fields as ShareField[],
  entryIds: r.entry_ids as string[],
  createdAt: iso(r.created_at)!,
  expiresAt: iso(r.expires_at)!,
  revokedAt: iso(r.revoked_at),
});

/** Consent valid now, joined to the raffle's frozen sponsor, purpose and version. */
const VALID_CONSENT = `c.withdrawn_at is null and c.verified_at is not null and c.recipient_sponsor_id = r.sponsor_id
  and c.purpose = r.share_purpose and c.version = r.sharing_version`;

const eventOf = (r: Row): RaffleEvent => ({
  id: String(r.id),
  raffleId: r.raffle_id as string,
  type: r.type as string,
  actor: { kind: r.actor_kind as Actor['kind'], id: r.actor_id as string },
  payload: r.payload as Record<string, unknown>,
  at: iso(r.at)!,
});

export function postgresRaffleStore(db: Queryable): RaffleStore {
  const q = async (text: string, params: unknown[] = []) => (await db.query<Row>(text, params)).rows;
  /** Runs `update` (returning *) and appends its audit row; null when no row matched. */
  const audited = async (update: string, params: unknown[], type: string, actor: Actor, payload: Row = {}) => {
    const n = params.length;
    const rows = await q(
      `with s as (${update}), e as (insert into raffle_events (raffle_id, type, actor_kind, actor_id, payload)
         select s.id, $${n + 1}, $${n + 2}, $${n + 3}, $${n + 4}::jsonb from s) select * from s`,
      [...params, type, actor.kind, actor.id, JSON.stringify(payload)],
    );
    return rows[0] ? raffleOf(rows[0]) : null;
  };
  const get = async (id: string) => {
    if (!UUID.test(id)) return null;
    const r = (await q('select * from raffles where id = $1', [id]))[0];
    return r ? raffleOf(r) : null;
  };
  const must = async (id: string) => {
    const r = await get(id);
    if (!r) throw new RaffleNotFound();
    return r;
  };
  /** No row matched: the raffle is gone, or it changed under us. */
  const missed = async (id: string) => ((await get(id)) ? conflict() : new RaffleNotFound());

  return {
    claimMail: async (lease, entryId) =>
      (
        await q(
          `with pending as (select key from raffle_mail where sent_at is null and (leased_at is null or leased_at < now()-interval '1 minute') and ($2::uuid is null or entry_id=$2) order by created_at limit 20 for update skip locked)
      update raffle_mail m set lease=$1,leased_at=now() from pending p where m.key=p.key returning m.*`,
          [lease, entryId ?? null],
        )
      ).map((r) => ({ key: String(r.key), entryId: String(r.entry_id), kind: r.kind as 'entry' | 'recovery' | 'winner', nonce: r.nonce as string | null })),
    finishMail: async (key, lease, sent) => {
      await q(`update raffle_mail set sent_at=case when $3 then now() end,nonce=case when $3 then null else nonce end,leased_at=null,lease=null where key=$1 and lease=$2`, [
        key,
        lease,
        sent,
      ]);
    },
    entryById: async (id) => {
      const r = (await q('select * from raffle_entries where id=$1', [id]))[0];
      return r ? entryOf(r) : null;
    },
    recover: async (rid, email, nonce, hash) => {
      if (!UUID.test(rid)) return;
      await q(
        `with g as(insert into raffle_management_grants(token_hash,entry_id) select $4,id from raffle_entries where raffle_id=$1 and email=$2 returning entry_id)
      insert into raffle_mail(key,entry_id,kind,nonce) select $4,entry_id,'recovery',$3 from g`,
        [rid, email, nonce, hash],
      );
    },
    claimDecision: async (id, seq) =>
      ((await q('select decision from raffle_claims where raffle_id=$1 and seq=$2', [id, seq]))[0]?.decision as 'claimed' | 'expired' | undefined) ?? null,
    decideClaim: async (id, seq, decision, actor) => {
      const rows = await q(
        `insert into raffle_claims(raffle_id,seq,decision,actor) select id,$2,$3,$4 from raffles where id=$1 and stage='drawn' and $2=(select max(seq) from raffle_draws where raffle_id=$1)
        on conflict(raffle_id,seq) do update set decision=raffle_claims.decision where raffle_claims.decision=excluded.decision returning seq`,
        [id, seq, decision, actor.id],
      );
      if (!rows.length) throw conflict();
    },
    fulfil: async (id, seq, note, actor) => {
      const rows = await q(
        `with done as(update raffles set stage='fulfilled',reason=null where id=$1 and stage='drawn' and $2=(select max(seq) from raffle_draws where raffle_id=$1) and exists(select 1 from raffle_claims where raffle_id=$1 and seq=$2 and decision='claimed') returning *),
        detail as(insert into raffle_fulfilments(raffle_id,seq,note) select id,$2,$3 from done),
        log as(insert into raffle_events(raffle_id,type,actor_kind,actor_id,payload) select id,'fulfilled',$4,$5,jsonb_build_object('seq',$2::int) from done) select * from done`,
        [id, seq, note, actor.kind, actor.id],
      );
      if (!rows[0]) throw conflict();
      return raffleOf(rows[0]);
    },
    unmatched: async (p) => {
      await q('insert into raffle_unmatched_payments(session_id,link_id,quote_ref,raffle_ref,amount_minor,currency) values($1,$2,$3,$4,$5,$6) on conflict(session_id) do nothing', [
        p.sessionId,
        p.linkId,
        p.quoteRef,
        p.raffleRef,
        p.amountMinor,
        p.currency,
      ]);
    },
    unmatchedPayments: async () =>
      (await q('select * from raffle_unmatched_payments order by recorded_at desc')).map((r) => ({
        sessionId: String(r.session_id),
        linkId: r.link_id as string | null,
        quoteRef: r.quote_ref as string | null,
        raffleRef: r.raffle_ref as string | null,
        amountMinor: Number(r.amount_minor),
        currency: String(r.currency),
      })),
    outstanding: async () =>
      (await q("select * from raffles where funding in ('paid','in_kind') and stage in ('offered','ready','open','closed','drawn') order by id")).map(raffleOf),
    async create(n, actor) {
      const rows = await q(
        `with s as (insert into raffles (sponsor_id, event_id, event_title, event_date, prize, quantity, budget_minor, fulfilment)
                    values ($1, $2, $3, $4, $5, $6, $7, $8) returning *),
              e as (insert into raffle_events (raffle_id, type, actor_kind, actor_id, payload)
                    select id, 'proposed', $9, $10, jsonb_build_object('eventId', event_id, 'fulfilment', fulfilment) from s)
         select * from s`,
        [n.sponsorId, n.eventId, n.eventTitle, n.eventDate, n.prize, n.quantity, n.budgetMinor, n.fulfilment, actor.kind, actor.id],
      );
      return raffleOf(rows[0]!);
    },
    get,
    bySponsor: async (sid) => (UUID.test(sid) ? (await q('select * from raffles where sponsor_id = $1 order by created_at desc', [sid])).map(raffleOf) : []),
    byPaymentLink: async (pl) => {
      const r = (await q('select * from raffles where payment_link_id = $1', [pl]))[0];
      return r ? raffleOf(r) : null;
    },
    list: async ({ stage, limit = 200 } = {}) =>
      (await q('select * from raffles where ($1::text is null or stage = $1) order by created_at desc limit $2', [stage ?? null, Math.min(Math.max(limit, 1), 1000)])).map(
        raffleOf,
      ),
    async moveStage(id, { from, to, actor, reason }) {
      const r = await must(id);
      if (r.stage !== from) throw conflict();
      const restoring = from === 'on_hold' && r.openedAt !== null && r.heldFrom === to;
      if (from === 'on_hold' && r.openedAt && !restoring && to !== 'cancelled') throw new RaffleRuleError('Resume the stage that was paused.');
      if (!restoring && GUARDED_STAGES.includes(to)) throw new RaffleRuleError(`Use the ${to === 'open' ? 'open entries' : 'draw'} action for that.`);
      checkStage(from, to, actor.kind);
      if (to === 'ready') {
        const why = readyBlocker(r);
        if (why) throw new RaffleRuleError(why);
      }
      const keep = to === 'ready' || to === 'offered' ? null : r.reason;
      const out = await audited(
        `update raffles set stage = $3, reason = $4, held_from = case when $3='on_hold' then stage end
      where id = $1 and stage = $2 and ($2<>'on_hold' or opened_at is null or $3='cancelled' or held_from=$3)
      and ($3 not in ('ready','open','closed','drawn') or $2<>'on_hold' or cardinality(flags)=0) returning *`,
        [id, from, to, reason ?? keep],
        'stage_changed',
        actor,
        {
          from,
          to,
        },
      );
      if (!out) throw conflict();
      return out;
    },
    async setFunding(id, { from, to, actor, payload = {} }) {
      checkFunding(from, to);
      const out = await audited(`update raffles set funding = $3 where id = $1 and funding = $2 returning *`, [id, from, to], 'funding_changed', actor, { ...payload, from, to });
      if (!out) throw await missed(id);
      return out;
    },
    async offer(id, { from, amountMinor, quoteId, termsVersion, actor }) {
      checkStage(from, 'offered', actor.kind);
      const out = await audited(
        `update raffles set stage = 'offered', amount_minor = $3, quote_id = $4, terms_version = $5,
           accepted_version = null, accepted_by = null, accepted_at = null, reason = null
         where id = $1 and stage = $2 returning *`,
        [id, from, amountMinor, quoteId, termsVersion],
        'offered',
        actor,
        { amountMinor, quoteId, termsVersion },
      );
      if (!out) throw await missed(id);
      return out;
    },
    async accept(id, { version, contactId, actor }) {
      const r = await must(id);
      if (r.stage !== 'offered' || r.termsVersion !== version) throw conflict();
      if (r.acceptedVersion === version) return r;
      const out = await audited(
        `update raffles set accepted_version = $2, accepted_by = $3, accepted_at = now() where id = $1 and stage = 'offered' and terms_version = $2 returning *`,
        [id, version, contactId],
        'terms_accepted',
        actor,
        { version, contactId },
      );
      if (!out) throw conflict();
      return out;
    },
    async linkPayment(id, link, actor) {
      const r = await must(id);
      const out = await audited(
        `update raffles set payment_link_id = $2, payment_link_url = $3 where id = $1 returning *`,
        [id, link?.id ?? null, link?.url ?? null],
        link ? 'payment_link_created' : 'payment_link_closed',
        actor,
        { paymentLinkId: link?.id ?? r.paymentLinkId },
      );
      return out!;
    },
    async flag(id, f, actor, payload = {}) {
      const out = await audited(`update raffles set flags = array_append(flags, $2) where id = $1 and not ($2 = any(flags)) returning *`, [id, f], 'flagged', actor, {
        ...payload,
        flag: f,
      });
      return out ?? must(id);
    },
    async clearFlag(id, f, actor) {
      const out = await audited(`update raffles set flags = array_remove(flags, $2) where id = $1 and $2 = any(flags) returning *`, [id, f], 'flag_cleared', actor, { flag: f });
      return out ?? must(id);
    },
    async addLedger(id, e, actor) {
      const rows = await q(
        `with s as (insert into raffle_ledger (raffle_id, kind, amount_minor, note, reference, actor_kind, actor_id) values ($1, $2, $3, $4, $5, $6, $7) returning *),
              e as (insert into raffle_events (raffle_id, type, actor_kind, actor_id, payload)
                    select raffle_id, 'ledger_added', actor_kind, actor_id, jsonb_build_object('kind', kind, 'amountMinor', amount_minor) from s)
         select * from s`,
        [id, e.kind, e.amountMinor, e.note, e.reference, actor.kind, actor.id],
      );
      return ledgerOf(rows[0]!);
    },
    ledger: async (id) => (UUID.test(id) ? (await q('select * from raffle_ledger where raffle_id = $1 order by at, id', [id])).map(ledgerOf) : []),
    events: async (id) => (UUID.test(id) ? (await q('select * from raffle_events where raffle_id = $1 order by at, id', [id])).map(eventOf) : []),
    stripeEventSeen: async (id) => (await q('select 1 from raffle_stripe_events where id = $1', [id])).length > 0,
    markStripeEvent: async (id, type) => void (await q('insert into raffle_stripe_events (id, type) values ($1, $2) on conflict (id) do nothing', [id, type])),

    async openEntries(id, { rulesVersion, rulesUrl, closesAt, actor, sharing, retentionDays }) {
      checkStage('ready', 'open', actor.kind);
      const out = await audited(
        `update raffles set stage = 'open', rules_version = $2, rules_url = $3, closes_at = $4, opened_at = now(),
           share_purpose = $5, share_privacy_url = $6, sharing_version = $7, notice_url=$8, retention_days=$9
         where id = $1 and stage = 'ready' returning *`,
        [id, rulesVersion, rulesUrl, closesAt, sharing?.purpose ?? null, sharing?.privacyUrl ?? null, sharing?.version ?? null, sharing?.noticeUrl ?? null, retentionDays ?? null],
        'entries_opened',
        actor,
        { rulesVersion, closesAt, sharingVersion: sharing?.version ?? null },
      );
      if (!out) throw await missed(id);
      return out;
    },
    async addEntry(raffleId, e, at) {
      if (!UUID.test(raffleId)) throw new RaffleNotFound();
      // Open and not closed yet, in the same statement as the insert.
      const rows = await q(
        `with ent as (insert into raffle_entries (raffle_id, name, email, claim_code, token_hash, created_at, notice_decision)
         select $1, $2, $3, $4, $5, $6, $8 from (select id from raffles where id=$1 and stage='open' and closes_at>$6 for update) admitted
         on conflict (raffle_id, email) do nothing returning *), consent as (
           insert into raffle_consents(entry_id,raffle_id,recipient_sponsor_id,purpose,version,given_at)
           select e.id,r.id,r.sponsor_id,r.share_purpose,r.sharing_version,e.created_at from ent e join raffles r on r.id=e.raffle_id where e.notice_decision and r.sharing_version is not null
         ), queued as(insert into raffle_mail(key,entry_id,kind,nonce) select 'entry:'||id,id,'entry',$7 from ent where $7::text is not null) select * from ent`,
        [raffleId, e.name, e.email.toLowerCase(), e.claimCode, e.tokenHash, at.toISOString(), e.mailNonce ?? null, e.noticeDecision ?? null],
      ).catch((err: { constraint?: string }) => {
        if (err.constraint === 'raffle_entries_raffle_id_claim_code_key') throw new RaffleRuleError('Claim code taken; try again.', 'conflict');
        throw err;
      });
      if (rows[0]) return { entry: entryOf(rows[0]), created: true };
      const existing = (await q('select * from raffle_entries where raffle_id = $1 and email = $2', [raffleId, e.email.toLowerCase()]))[0];
      if (existing) return { entry: entryOf(existing), created: false };
      if (!(await get(raffleId))) throw new RaffleNotFound();
      throw new RaffleRuleError('Entries are closed.', 'conflict');
    },
    entryByToken: async (hash) => {
      if (!/^[0-9a-f]{64}$/.test(hash)) return null;
      const r = (await q('select * from raffle_entries where token_hash = $1 or id=(select entry_id from raffle_management_grants where token_hash=$1)', [hash]))[0];
      return r ? entryOf(r) : null;
    },
    async verifyEntry(entryId) {
      // The address is confirmed: so is a choice made on the entry form.
      const r = (
        await q(
          `with e as (update raffle_entries set email_verified_at = coalesce(email_verified_at, now()) where id = $1 returning *),
                c as (update raffle_consents set verified_at = coalesce(verified_at, now()) where entry_id = $1 and withdrawn_at is null)
           select * from e`,
          [entryId],
        )
      )[0];
      if (!r) throw new RaffleNotFound();
      return entryOf(r);
    },
    entries: async (rid) => (UUID.test(rid) ? (await q('select * from raffle_entries where raffle_id = $1 order by created_at, id', [rid])).map(entryOf) : []),
    entryCounts: async (rid) => {
      const r = UUID.test(rid) ? (await q('select count(*)::int as total, count(email_verified_at)::int as verified from raffle_entries where raffle_id = $1', [rid]))[0] : null;
      return { total: Number(r?.total ?? 0), verified: Number(r?.verified ?? 0) };
    },
    async draw(rid, { actor, pick }) {
      const existing = async () => {
        const d = (await q('select * from raffle_draws where raffle_id = $1 and seq = 1', [rid]))[0];
        if (!d) return null;
        const e = (await q('select * from raffle_entries where id = $1', [d.entry_id]))[0]!;
        return { draw: drawOf(d), entry: entryOf(e), repeated: true };
      };
      const before = await existing();
      if (before) return before;
      const r = await must(rid);
      if (r.stage !== 'closed') throw new RaffleRuleError('Close the entries before drawing.', 'conflict');
      checkStage('closed', 'drawn', actor.kind);
      // Entries cannot change while closed, so this list is the one the draw uses.
      const eligible = (await q('select * from raffle_entries where raffle_id = $1 order by created_at, id', [rid])).map(entryOf).sort(drawOrder);
      if (!eligible.length) throw new RaffleRuleError('There are no entries to draw from.');
      const index = pick(eligible.length);
      const hash = entriesHash(eligible);
      // One statement: closed → drawn and the draw row, or nothing (a second click got there first).
      const rows = await q(
        `with s as (update raffles set stage = 'drawn' where id = $1 and stage = 'closed' returning id),
              d as (insert into raffle_draws (raffle_id, seq, entry_id, eligible_count, entries_hash, index, actor_kind, actor_id)
                    select $1, 1, $2, $3, $4, $5, $6, $7 from s returning *),
              e as (insert into raffle_events (raffle_id, type, actor_kind, actor_id, payload)
                    select raffle_id, 'drawn', actor_kind, actor_id, jsonb_build_object('seq', 1, 'eligibleCount', eligible_count, 'entriesHash', entries_hash) from d)
         , queued as(insert into raffle_mail(key,entry_id,kind) select 'winner:'||raffle_id||':'||seq,entry_id,'winner' from d) select * from d`,
        [rid, eligible[index]!.id, eligible.length, hash, index, actor.kind, actor.id],
      );
      if (rows[0]) return { draw: drawOf(rows[0]), entry: eligible[index]!, repeated: false };
      const after = await existing();
      if (after) return after;
      throw conflict();
    },
    async redraw(rid, { actor, reason, pick, afterSeq }) {
      if (!reason.trim()) throw new RaffleRuleError('A redraw needs a reason.', 'invalid');
      const r = await must(rid);
      if (r.stage !== 'drawn') throw new RaffleRuleError('Only a drawn raffle can be drawn again.', 'conflict');
      const eligible = (
        await q(
          'select * from raffle_entries e where raffle_id = $1 and not exists (select 1 from raffle_draws d where d.raffle_id = $1 and d.entry_id = e.id) order by created_at, id',
          [rid],
        )
      )
        .map(entryOf)
        .sort(drawOrder);
      if (!eligible.length) throw new RaffleRuleError('Nobody is left to draw.');
      const index = pick(eligible.length);
      const rows = await q(
        `with d as (insert into raffle_draws (raffle_id, seq, entry_id, eligible_count, entries_hash, index, reason, actor_kind, actor_id)
                    select $1, $2 + 1, $3, $4, $5, $6, $7, $8, $9
                    where (select max(seq) from raffle_draws where raffle_id = $1) = $2
                    on conflict (raffle_id, seq) do nothing returning *),
              e as (insert into raffle_events (raffle_id, type, actor_kind, actor_id, payload)
                    select raffle_id, 'redrawn', actor_kind, actor_id, jsonb_build_object('seq', seq, 'eligibleCount', eligible_count, 'entriesHash', entries_hash) from d)
         , queued as(insert into raffle_mail(key,entry_id,kind) select 'winner:'||raffle_id||':'||seq,entry_id,'winner' from d) select * from d`,
        [rid, afterSeq, eligible[index]!.id, eligible.length, entriesHash(eligible), index, reason.trim().slice(0, 500), actor.kind, actor.id],
      );
      if (!rows[0]) throw conflict();
      return { draw: drawOf(rows[0]), entry: eligible[index]! };
    },
    draws: async (rid) => (UUID.test(rid) ? (await q('select * from raffle_draws where raffle_id = $1 order by seq', [rid])).map(drawOf) : []),

    async giveConsent(entryId, { verified, at }) {
      const e = (await q('select e.*, r.sponsor_id, r.share_purpose, r.sharing_version from raffle_entries e join raffles r on r.id = e.raffle_id where e.id = $1', [entryId]))[0];
      if (!e) throw new RaffleNotFound();
      if (!e.sharing_version || !e.share_purpose) throw new RaffleRuleError('This raffle does not share contacts with its sponsor.');
      const verifiedAt = verified || e.email_verified_at ? at.toISOString() : null;
      const rows = await q(
        `insert into raffle_consents (entry_id, raffle_id, recipient_sponsor_id, purpose, version, given_at, verified_at)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (entry_id) where withdrawn_at is null do update set verified_at = coalesce(raffle_consents.verified_at, excluded.verified_at)
         returning *`,
        [entryId, e.raffle_id, e.sponsor_id, e.share_purpose, e.sharing_version, at.toISOString(), verifiedAt],
      );
      return consentOf(rows[0]!);
    },
    async withdrawConsent(entryId, at) {
      const r = (await q('update raffle_consents set withdrawn_at = $2 where entry_id = $1 and withdrawn_at is null returning *', [entryId, at.toISOString()]))[0];
      return r ? consentOf(r) : null;
    },
    consentOf: async (entryId) => {
      if (!UUID.test(entryId)) return null;
      const r = (await q('select * from raffle_consents where entry_id = $1 and withdrawn_at is null', [entryId]))[0];
      return r ? consentOf(r) : null;
    },
    consentedEntries: async (rid) =>
      UUID.test(rid)
        ? (
            await q(
              `select e.* from raffle_entries e join raffle_consents c on c.entry_id = e.id join raffles r on r.id = e.raffle_id
               where e.raffle_id = $1 and ${VALID_CONSENT} order by e.created_at, e.id`,
              [rid],
            )
          ).map(entryOf)
        : [],
    async consentCounts(rid) {
      const r = (
        await q(
          `select count(*) filter (where c.withdrawn_at is null)::int as given,
                  count(*) filter (where ${VALID_CONSENT})::int as valid,
                  count(*) filter (where c.withdrawn_at is not null)::int as withdrawn
           from raffle_consents c join raffles r on r.id = c.raffle_id where c.raffle_id = $1`,
          [rid],
        )
      )[0];
      return { given: Number(r?.given ?? 0), valid: Number(r?.valid ?? 0), withdrawn: Number(r?.withdrawn ?? 0) };
    },
    async createShare(rid, { exact, recipientContactId, fields, entryIds, expiresAt, actor }) {
      const r = await must(rid);
      if (!r.sharingVersion || !r.sharePurpose) throw new RaffleRuleError('This raffle does not share contacts with its sponsor.');
      // One statement: narrow to valid consent now, record the share, append the audit row.
      const rows = await q(
        `with ok as (select array_agg(e.id order by e.created_at, e.id) as ids
                     from raffle_entries e join raffle_consents c on c.entry_id = e.id join raffles r on r.id = e.raffle_id
                     where e.raffle_id = $1 and e.id = any($2::uuid[]) and ${VALID_CONSENT}),
              s as (insert into raffle_shares (raffle_id, recipient_contact_id, purpose, fields, entry_ids, expires_at)
                    select $1, $3, $4, $5, ok.ids, $6 from ok where ok.ids is not null and (not $9::boolean or cardinality(ok.ids)=cardinality($2::uuid[])) and exists(select 1 from sponsor_contacts ct join raffles rr on rr.sponsor_id=ct.sponsor_id where rr.id=$1 and ct.id=$3 and (ct.added_by <> 'sponsor' or ct.user_id is not null)) returning *),
              a as (insert into raffle_events (raffle_id, type, actor_kind, actor_id, payload)
                    select $1, 'shared', $7, $8, jsonb_build_object('shareId', s.id, 'recipientContactId', s.recipient_contact_id, 'purpose', s.purpose,
                                                                    'fields', to_jsonb(s.fields), 'entryIds', to_jsonb(s.entry_ids), 'expiresAt', s.expires_at) from s)
         select * from s`,
        [rid, entryIds.filter((x) => UUID.test(x)), recipientContactId, r.sharePurpose, fields, expiresAt, actor.kind, actor.id, exact ?? false],
      );
      if (!rows[0]) throw new RaffleRuleError('None of the chosen entries has a valid consent now.');
      return shareOf(rows[0]);
    },
    getShare: async (id) => {
      if (!UUID.test(id)) return null;
      const r = (await q('select * from raffle_shares where id = $1', [id]))[0];
      return r ? shareOf(r) : null;
    },
    shares: async (rid) => (UUID.test(rid) ? (await q('select * from raffle_shares where raffle_id = $1 order by created_at desc', [rid])).map(shareOf) : []),
    async revokeShare(id, actor) {
      const rows = await q(
        `with s as (update raffle_shares set revoked_at = coalesce(revoked_at, now()) where id = $1 returning *),
              a as (insert into raffle_events (raffle_id, type, actor_kind, actor_id, payload) select raffle_id, 'share_revoked', $2, $3, jsonb_build_object('shareId', id) from s)
         select * from s`,
        [id, actor.kind, actor.id],
      );
      if (!rows[0]) throw new RaffleNotFound();
      return shareOf(rows[0]);
    },
    async readShare(id, actor, at) {
      if (!UUID.test(id)) throw new RaffleNotFound();
      const result = (
        await q(
          `with allowed as materialized (
        select s.* from raffle_shares s join raffles r on r.id=s.raffle_id
        join sponsor_contacts contact on contact.id=s.recipient_contact_id and contact.sponsor_id=r.sponsor_id
        where s.id=$1 and contact.user_id=$2 and s.revoked_at is null and s.expires_at>$3 and r.erased_at is null
        for share of s,contact,r
      ), delivered as materialized (
        select e.id,c.id as consent_id,e.created_at,
          case when 'name'=any(s.fields) then e.name else '' end name,
          case when 'email'=any(s.fields) then e.email::text else '' end email
        from allowed s join raffles r on r.id=s.raffle_id join raffle_entries e on e.raffle_id=r.id and e.id=any(s.entry_ids)
        join raffle_consents c on c.entry_id=e.id where ${VALID_CONSENT} for share of c
      ), receipts as (
        insert into raffle_deliveries(share_id,consent_id) select $1,consent_id from delivered on conflict do nothing
      ), audit as (
        insert into raffle_events(raffle_id,type,actor_kind,actor_id,payload)
        select raffle_id,'share_read','sponsor',$2,jsonb_build_object('shareId',id,'entryIds',(select coalesce(jsonb_agg(id),'[]') from delivered),'rows',(select count(*) from delivered)) from allowed
      )
      select s.*,(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'email',email) order by created_at,id),'[]') from delivered) as rows from allowed s`,
          [id, actor.id, at.toISOString()],
        )
      )[0];
      if (!result) throw new RaffleRuleError('This share has expired or was withdrawn.');
      return { share: shareOf(result), rows: result.rows as Pick<Entry, 'id' | 'name' | 'email'>[] };
    },
    dueForErasure: async (at) =>
      (await q('select id from raffles where erased_at is null and erase_after <= $1 order by erase_after limit 100', [at.toISOString()])).map((x) => String(x.id)),
    deletionTasks: async (rid, contact) =>
      (
        await q(
          `select d.share_id,d.consent_id,c.entry_id,d.acknowledged_at
      from raffle_deliveries d join raffle_consents c on c.id=d.consent_id join raffle_shares s on s.id=d.share_id
      where c.withdrawn_at is not null and s.raffle_id=$1 and ($2::uuid is null or s.recipient_contact_id=$2)`,
          [rid, contact ?? null],
        )
      ).map((x) => ({ shareId: String(x.share_id), consentId: String(x.consent_id), entryId: String(x.entry_id), acknowledged: x.acknowledged_at != null })),
    acknowledgeDeletion: async (rid, contact, share, consent) =>
      UUID.test(share) &&
      UUID.test(consent) &&
      (
        await q(
          `update raffle_deliveries d set acknowledged_at=coalesce(d.acknowledged_at,now())
      from raffle_consents c,raffle_shares s where d.share_id=s.id and d.consent_id=c.id and s.raffle_id=$1 and s.recipient_contact_id=$2
      and d.share_id=$3 and d.consent_id=$4 and c.withdrawn_at is not null returning d.share_id`,
          [rid, contact, share, consent],
        )
      ).length === 1,
    async eraseEntries(rid, actor) {
      const rows = await q(
        `with due as (update raffles set erased_at=now(),reason=case when stage='fulfilled' then null else reason end where id=$1 and erased_at is null returning id),
                    forget_grants as(delete from raffle_management_grants where entry_id in(select e.id from raffle_entries e join due r on r.id=e.raffle_id)),
                    forget_mail as(delete from raffle_mail where entry_id in(select e.id from raffle_entries e join due r on r.id=e.raffle_id)),
                    forget_notes as(update raffle_fulfilments set note=null where raffle_id in(select id from due)),
                    stop_consent as(update raffle_consents set withdrawn_at=now() where raffle_id in(select id from due) and withdrawn_at is null),
                    e as (update raffle_entries set name = 'Erased', token_hash=encode(sha256(gen_random_uuid()::text::bytea),'hex'),email_verified_at=null, email = 'erased-' || id || '@invalid.invalid'
                    where raffle_id in(select id from due) and email <> ('erased-' || id || '@invalid.invalid') returning id),
              a as (insert into raffle_events (raffle_id, type, actor_kind, actor_id, payload)
                    select $1, 'entries_erased', $2, $3, jsonb_build_object('count', (select count(*) from e)) from due)
         select count(*)::int as n from e`,
        [rid, actor.kind, actor.id],
      );
      return Number(rows[0]?.n ?? 0);
    },
  };
}
