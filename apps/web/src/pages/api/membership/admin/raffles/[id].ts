/**
 * What the board does with one raffle add-on. Every action re-reads the raffle and is
 * compare-and-set; money questions (underspend, overspend, refunds) are recorded states the board
 * settles, never automatic. No Stripe refund is made here: refunds are done in Stripe and recorded.
 *
 * POST { action, ... } → 200 { ok, raffle: AdminRaffleView } · 400 · 404 · 409
 *   offer        { amountChf?, feeChoice? }  proposed or on hold → offered (needs the raffle terms gate;
 *                the sponsorship must be eligible; a ZurichJS-bought prize freezes a quote)
 *   decline      { reason }                  proposed → declined
 *   in_kind      { note, reference? }        the sponsor's prize arrived: funding in kind
 *   ledger       { kind: prize_purchase | delivery, amountChf, note, reference? }
 *   ready        prize bought (or arrived), paid or in kind, terms accepted → ready
 *   hold         { reason, meetupChanged? }  → on hold (money in: flagged for a refund decision)
 *   resume       on hold → offered or ready (the board decided to go ahead)
 *   cancel       { reason }                  → cancelled (money in: flagged for a refund decision)
 *   refund       { decision: 'refund' }      paid → refund being decided
 *   refunded     { amountChf, reference }    the refund was made in Stripe or by bank: recorded
 *   clear_flag   { flag }
 *   open         { closesAt (ISO) }          ready → entries open, under the approved entrant rules (frozen)
 *   close        open → closed (no more entries)
 *   draw         closed → drawn: one uniform random winner from all entries, once; again returns the same
 *   redraw       { reason }                  another draw without earlier winners (the rules say when)
 *   fulfil       { note }                    drawn → prize delivered
 * The winner is emailed privately; the public page shows the claim code only. Slack gets counts.
 */
import { RaffleRuleError, uniformIndex, type Flag, type Raffle } from '@zurichjs/raffle';
import { francsToMinor, isFeeChoice, quoteFigures } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../server/http.ts';
import { requireHost, assertEligible, closeRafflePaymentLink, loadAdminView, raffleStore, rulesGate, termsGate } from '../../../../../server/raffle.ts';
import { deliverRaffleMail } from '../../../../../server/raffle-mail.ts';
import { note, slackText } from '../../../../../server/sponsor.ts';
import { reconcileFee } from '../../../../../server/sponsor-offers.ts';
import { raffleTransaction } from '../../../../../server/raffle-transaction.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../server/sponsor-admin.ts';
import { currentGate, feeStore } from '../../../../../server/sponsor-fees.ts';

export const prerender = false;

const FLAGS: Flag[] = ['late_payment', 'amount_mismatch', 'meetup_changed', 'refund_review'];
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const money = (v: unknown) => (typeof v === 'string' ? francsToMinor(v) : typeof v === 'number' && Number.isInteger(v * 100) ? Math.round(v * 100) : null);

export const handleAdminRaffle = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ env, store, lifecycle, origin }) => {
      const raffles = deps.raffles ?? raffleStore(env);
      const fees = deps.fees ?? feeStore(env);
      const r = await raffles.get(id);
      if (!r) return fail(404, 'No such raffle.');
      const body = (await readJsonObject(request)) ?? {};
      const now = deps.now === undefined ? new Date() : new Date(deps.now);
      const answer = async (x: Raffle) => json(200, { ok: true, raffle: await loadAdminView(x, raffles, fees, origin) });
      const stop = async (to: 'on_hold' | 'cancelled', reason: string) => {
        if (!reason) return fail(400, 'Give a reason; the sponsor sees it.', { field: 'reason' });
        let out = await raffles.moveStage(r.id, { from: r.stage, to, actor: BOARD, reason });
        if (r.funding === 'unpaid') {
          await closeRafflePaymentLink(r, lifecycle.stripe);
          if (r.paymentLinkId) out = await raffles.linkPayment(r.id, null, BOARD);
          if (r.quoteId && to === 'cancelled') await fees.voidQuote(r.quoteId);
        }
        if (r.funding === 'paid') out = await raffles.flag(r.id, 'refund_review', BOARD, { stage: to });
        if (body.meetupChanged === true) out = await raffles.flag(r.id, 'meetup_changed', BOARD);
        return answer(out);
      };

      switch (body.action) {
        case 'reconcile': {
          for (const p of await fees.payments(r.sponsorId))
            if (p.subject === 'raffle' && p.subjectId === r.id && p.feeMinor === null) await reconcileFee(p, fees, lifecycle.stripe);
          return answer(r);
        }
        case 'offer': {
          const gate = termsGate(env);
          if (!gate.open) throw new RaffleRuleError(gate.reason, 'gate');
          const s = await store.get(r.sponsorId);
          if (!s) return fail(404, 'No such sponsor.');
          assertEligible(s, now);
          if (!['proposed', 'on_hold'].includes(r.stage) || r.funding !== 'unpaid') throw new RaffleRuleError('Only an unpaid proposal or held offer may be offered.');
          await requireHost(r.eventId, env, deps, now);
          if (r.fulfilment === 'in_kind') return answer(await raffles.offer(r.id, { from: r.stage, amountMinor: null, quoteId: null, termsVersion: gate.version, actor: BOARD }));
          const amount = money(body.amountChf);
          if (amount === null || amount < 100 || amount > 1_000_000) return fail(400, 'Enter the amount in francs, from 1 to 10’000.', { field: 'amountChf' });
          const choice = body.feeChoice ?? 'absorb';
          if (!isFeeChoice(choice)) return fail(400, 'Choose who covers the fees.', { field: 'feeChoice' });
          const figures = quoteFigures(amount, choice, await currentGate(fees, env));
          await closeRafflePaymentLink(r, lifecycle.stripe);
          if (r.paymentLinkId) await raffles.linkPayment(r.id, null, BOARD);
          return answer(
            await raffleTransaction(env, r.id, deps, async ({ raffles, fees }) => {
              const latest = await raffles.get(r.id);
              if (latest?.stage !== r.stage || latest.funding !== 'unpaid') throw new RaffleRuleError('This offer has changed.');
              const { quote } = await fees.createQuote({
                ...figures,
                sponsorId: r.sponsorId,
                subject: 'raffle',
                subjectId: r.id,
                purpose: `Raffle add-on: ${r.prize}, ${r.eventTitle}`.slice(0, 300),
                createdBy: 'board',
              });
              return raffles.offer(r.id, { from: r.stage, amountMinor: amount, quoteId: quote.id, termsVersion: gate.version, actor: BOARD });
            }),
          );
        }
        case 'decline': {
          const reason = text(body.reason, 1000);
          if (!reason) return fail(400, 'Give a reason; the sponsor sees it.', { field: 'reason' });
          return answer(await raffles.moveStage(r.id, { from: r.stage, to: 'declined', actor: BOARD, reason }));
        }
        case 'in_kind': {
          if (r.fulfilment !== 'in_kind') return fail(409, 'This prize is bought by ZurichJS, not sent by the sponsor.');
          const note = text(body.note, 500);
          if (!note) return fail(400, 'Describe what arrived (a delivery note).', { field: 'note' });
          await raffles.addLedger(r.id, { kind: 'in_kind_received', amountMinor: 0, note, reference: text(body.reference, 200) || null }, BOARD);
          return answer(r.funding === 'unpaid' ? await raffles.setFunding(r.id, { from: 'unpaid', to: 'in_kind', actor: BOARD }) : r);
        }
        case 'ledger': {
          if (body.kind !== 'prize_purchase' && body.kind !== 'delivery') return fail(400, 'Choose prize or delivery.', { field: 'kind' });
          const amount = money(body.amountChf);
          if (amount === null || amount < 1 || amount > 1_000_000) return fail(400, 'Enter the amount in francs, like 420.50.', { field: 'amountChf' });
          const note = text(body.note, 500);
          if (!note) return fail(400, 'Describe it, with the receipt number if there is one.', { field: 'note' });
          await raffles.addLedger(r.id, { kind: body.kind, amountMinor: amount, note, reference: text(body.reference, 200) || null }, BOARD);
          return answer((await raffles.get(r.id))!);
        }
        case 'ready': {
          const ledger = await raffles.ledger(r.id);
          const prize = ledger.some((e) => e.kind === (r.fulfilment === 'in_kind' ? 'in_kind_received' : 'prize_purchase'));
          if (!prize) throw new RaffleRuleError(r.fulfilment === 'in_kind' ? 'Record that the prize arrived first.' : 'Record the prize purchase, with its receipt, first.');
          return answer(await raffles.moveStage(r.id, { from: r.stage, to: 'ready', actor: BOARD }));
        }
        case 'hold':
          return stop('on_hold', text(body.reason, 1000));
        case 'cancel':
          return stop('cancelled', text(body.reason, 1000));
        case 'resume': {
          if (r.stage !== 'on_hold') throw new RaffleRuleError('Only a raffle on hold can go ahead again.');
          const ledger = await raffles.ledger(r.id);
          if (!ledger.some((e) => e.kind === (r.fulfilment === 'in_kind' ? 'in_kind_received' : 'prize_purchase')))
            throw new RaffleRuleError('Record the prize receipt or delivery before resuming.');
          const to = r.acceptedVersion && (r.funding === 'paid' || r.funding === 'in_kind') ? 'ready' : 'offered';
          if (to === 'offered') throw new RaffleRuleError('Send a new offer instead: it was not accepted and paid yet.');
          return answer(await raffles.moveStage(r.id, { from: 'on_hold', to, actor: BOARD }));
        }
        case 'refund':
          if (body.decision !== 'refund') return fail(400, 'Say what was decided.', { field: 'decision' });
          return answer(await raffles.setFunding(r.id, { from: 'paid', to: 'refund_pending', actor: BOARD }));
        case 'refunded': {
          const amount = money(body.amountChf);
          const reference = text(body.reference, 200);
          if (amount === null || amount < 1) return fail(400, 'Enter the refunded amount in francs.', { field: 'amountChf' });
          if (!reference) return fail(400, 'Give the Stripe refund id or bank reference.', { field: 'reference' });
          return answer(
            await raffleTransaction(env, r.id, deps, async ({ raffles }) => {
              const current = (await raffles.get(r.id))!;
              const prior = (await raffles.ledger(r.id)).find((e) => e.kind === 'refund' && e.reference === reference);
              if (prior && prior.amountMinor === amount) return current;
              if (prior || current.funding !== 'refund_pending') throw new RaffleRuleError('Check the existing refund before recording this one.');
              await raffles.setFunding(r.id, { from: 'refund_pending', to: 'refunded', actor: BOARD });
              await raffles.addLedger(r.id, { kind: 'refund', amountMinor: amount, note: 'Refund', reference }, BOARD);
              return raffles.clearFlag(r.id, 'refund_review', BOARD);
            }),
          );
        }
        case 'open': {
          const terms = termsGate(env);
          if (!terms.open || r.acceptedVersion !== terms.version || r.termsVersion !== terms.version)
            throw new RaffleRuleError('The currently approved raffle agreement must be accepted.');
          if (r.flags.length) throw new RaffleRuleError('Resolve outstanding reviews before opening entries.');
          const sponsor = await store.get(r.sponsorId);
          if (!sponsor) return fail(404, 'No such sponsor.');
          assertEligible(sponsor, now);
          await requireHost(r.eventId, env, deps, now);
          const gate = rulesGate(env);
          if (!gate.open) throw new RaffleRuleError(gate.reason, 'gate');
          const closes = typeof body.closesAt === 'string' ? new Date(body.closesAt) : null;
          if (!closes || Number.isNaN(closes.getTime()) || closes <= now) return fail(400, 'Choose when entries close, in the future.', { field: 'closesAt' });
          if (closes.toISOString().slice(0, 10) > r.eventDate) return fail(400, 'Entries must close by the end of the meetup day.', { field: 'closesAt' });
          return answer(await raffles.openEntries(r.id, { rulesVersion: gate.version, rulesUrl: gate.url, closesAt: closes.toISOString(), actor: BOARD }));
        }
        case 'close': {
          const out = await raffles.moveStage(r.id, { from: 'open', to: 'closed', actor: BOARD });
          const counts = await raffles.entryCounts(r.id);
          await note(`:ticket: Raffle entries closed for ${slackText(r.eventTitle)}: ${counts.total} ${counts.total === 1 ? 'entry' : 'entries'}.`, lifecycle);
          return answer(out);
        }
        case 'draw': {
          const d = await raffles.draw(r.id, { actor: BOARD, pick: (n) => uniformIndex(n) });
          await deliverRaffleMail(env, raffles, store, origin, { entryId: d.entry.id, fetch: deps.fetch });
          if (!d.repeated) await note(`:tada: Raffle drawn from ${d.draw.eligibleCount} entries.`, lifecycle);
          return answer((await raffles.get(r.id))!);
        }
        case 'claim':
        case 'expire': {
          if (typeof body.seq !== 'number' || !Number.isSafeInteger(body.seq)) return fail(400, 'Review the current draw first.');
          await raffles.decideClaim(r.id, body.seq, body.action === 'claim' ? 'claimed' : 'expired', BOARD);
          return answer(r);
        }
        case 'redraw': {
          const reason = text(body.reason, 500);
          const seq = body.afterSeq;
          if (!reason || typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 1) return fail(400, 'Review the draw and give a reason for drawing again.');
          const result = await raffleTransaction(env, r.id, deps, async ({ raffles }) => {
            const draws = await raffles.draws(r.id);
            const replay = draws.find((d) => d.seq === seq + 1);
            if (replay && replay.reason === reason) return { entryId: replay.entryId, repeated: true, count: replay.eligibleCount };
            if ((await raffles.claimDecision(r.id, seq)) !== 'expired') throw new RaffleRuleError('Record that the claim expired under the published rules first.');
            const d = await raffles.redraw(r.id, { actor: BOARD, reason, afterSeq: seq, pick: (n) => uniformIndex(n) });
            return { entryId: d.entry.id, repeated: false, count: d.draw.eligibleCount };
          });
          await deliverRaffleMail(env, raffles, store, origin, { entryId: result.entryId, fetch: deps.fetch });
          if (!result.repeated) await note(`:repeat: Raffle drawn again from ${result.count} entries.`, lifecycle);
          return answer((await raffles.get(r.id))!);
        }
        case 'fulfil': {
          const done = text(body.note, 500);
          if (!done || typeof body.seq !== 'number') return fail(400, 'Review the draw and say how the prize reached the winner.');
          return answer(await raffles.fulfil(r.id, body.seq, done, BOARD));
        }
        case 'clear_flag':
          if (!FLAGS.includes(body.flag as Flag)) return fail(400, 'Unknown flag.', { field: 'flag' });
          return answer(await raffles.clearFlag(r.id, body.flag as Flag, BOARD));
        default:
          return fail(400, 'Unknown action.', { field: 'action' });
      }
    },
    'change the raffle',
  );

export const POST: APIRoute = ({ request, params }) => handleAdminRaffle(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
