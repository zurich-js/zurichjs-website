/**
 * Who covers payment-processing fees, and the quote a sponsor pays (docs/domains/sponsorship/fees.md).
 * Pure arithmetic in minor units (rappen); the server computes every quote, the browser only shows it.
 *
 * "ZurichJS covers the fees" (absorb) is the default. "Sponsor covers the fees" (pass-through) needs
 * the fee gate open: a tariff the board entered (rate and fixed fee per card payment) and a surcharge
 * policy version the owner approved. Nothing here ships a tariff or a policy.
 *
 * Gross-up: for rate r and fixed fee f, the total that leaves the base B after fees is
 * G = ceil((B + f) / (1 - r)); the surcharge is G - B. Adding r × B instead under-recovers, because
 * the fee is charged on the surcharge too.
 */

export type FeeChoice = 'absorb' | 'pass_through';
export const FEE_CHOICES: readonly FeeChoice[] = ['absorb', 'pass_through'];
export const isFeeChoice = (v: unknown): v is FeeChoice => v === 'absorb' || v === 'pass_through';

export const FEE_CHOICE_LABEL: Record<FeeChoice, string> = {
  absorb: 'ZurichJS covers the fees',
  pass_through: 'Sponsor covers the fees',
};

/** Rates are parts per million: 2.9% is 29'000. Integers only, so no float rounding anywhere. */
const PPM = 1_000_000;
/** Above this a "fee" is not a processing fee; the board typed something wrong. */
export const MAX_RATE_PPM = 100_000;
export const MAX_FIXED_MINOR = 1_000;
export const MAX_BASE_MINOR = 100_000_000;

/** A card tariff the board entered, as a version. Rows are never changed: a new tariff is a new version. */
export interface Tariff {
  version: string;
  method: 'card';
  currency: 'chf';
  ratePpm: number;
  fixedMinor: number;
  note: string | null;
  enteredBy: string;
  enteredAt: string;
}

export type FeeGate = { open: true; tariff: Tariff; policyVersion: string } | { open: false; reason: string };

/** Pass-through is allowed only with a tariff and an approved policy version. */
export function feeGate(tariff: Tariff | null, policyVersion: string | null | undefined): FeeGate {
  const policy = policyVersion?.trim();
  if (!policy) return { open: false, reason: 'No surcharge policy is approved (SPONSOR_FEE_POLICY_VERSION is not set). ZurichJS covers the fees.' };
  if (!tariff) return { open: false, reason: 'No card tariff is entered yet. ZurichJS covers the fees.' };
  return { open: true, tariff, policyVersion: policy };
}

/** What a quote freezes. `formula` names the arithmetic, so a later formula never rereads old quotes. */
export interface QuoteFigures {
  currency: 'chf';
  baseMinor: number;
  surchargeMinor: number;
  totalMinor: number;
  feeChoice: FeeChoice;
  tariffVersion: string | null;
  policyVersion: string | null;
  formula: 'none' | 'gross-up-v1';
}

export class FeeGateClosed extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'FeeGateClosed';
  }
}

const whole = (n: number, max: number, what: string) => {
  if (!Number.isSafeInteger(n) || n < 0 || n > max) throw new RangeError(`${what} must be a whole number from 0 to ${max}.`);
};

/** The total that leaves `baseMinor` after a fee of `ratePpm` and `fixedMinor`, rounded up to the rappen. */
export function grossUp(baseMinor: number, ratePpm: number, fixedMinor: number): number {
  whole(baseMinor, MAX_BASE_MINOR, 'The base');
  whole(ratePpm, MAX_RATE_PPM, 'The rate');
  whole(fixedMinor, MAX_FIXED_MINOR, 'The fixed fee');
  const num = BigInt(baseMinor + fixedMinor) * BigInt(PPM);
  const den = BigInt(PPM - ratePpm);
  return Number((num + den - 1n) / den);
}

/** The figures of a new quote. Throws FeeGateClosed for pass-through without an open gate. */
export function quoteFigures(baseMinor: number, choice: FeeChoice, gate: FeeGate): QuoteFigures {
  whole(baseMinor, MAX_BASE_MINOR, 'The base');
  if (baseMinor === 0) throw new RangeError('The base must be more than zero.');
  if (choice === 'absorb')
    return { currency: 'chf', baseMinor, surchargeMinor: 0, totalMinor: baseMinor, feeChoice: 'absorb', tariffVersion: null, policyVersion: null, formula: 'none' };
  if (!gate.open) throw new FeeGateClosed(gate.reason);
  const total = grossUp(baseMinor, gate.tariff.ratePpm, gate.tariff.fixedMinor);
  return {
    currency: 'chf',
    baseMinor,
    surchargeMinor: total - baseMinor,
    totalMinor: total,
    feeChoice: 'pass_through',
    tariffVersion: gate.tariff.version,
    policyVersion: gate.policyVersion,
    formula: 'gross-up-v1',
  };
}

/**
 * What the board's tariff says a card payment of `totalMinor` costs, rounded up to the rappen: an
 * estimate to preview an offer, never a figure a sponsor pays. Stripe reports the actual fee later.
 */
export function estimatedFee(totalMinor: number, tariff: Pick<Tariff, 'ratePpm' | 'fixedMinor'>): number {
  whole(totalMinor, MAX_BASE_MINOR * 2, 'The total');
  const variable = (BigInt(totalMinor) * BigInt(tariff.ratePpm) + BigInt(PPM - 1)) / BigInt(PPM);
  return Number(variable) + tariff.fixedMinor;
}

/** "CHF 1’546.07": quotes always show rappen. */
export const chfMinor = (minor: number) => {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const francs = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '’');
  return `${sign}CHF ${francs}.${String(abs % 100).padStart(2, '0')}`;
};

/** "2.9" → 29'000 ppm; "0.30" → 30 rappen. Decimal strings only, no floats. Null when not a valid number. */
export function parseDecimal(text: string, places: number): number | null {
  const m = /^(\d{1,6})(?:[.,](\d{0,6}))?$/.exec(text.trim());
  if (!m) return null;
  const frac = m[2] ?? '';
  if (frac.length > places && /[1-9]/.test(frac.slice(places))) return null;
  return Number(m[1]) * 10 ** places + Number((frac + '0'.repeat(places)).slice(0, places));
}
/** Percent text to ppm: "2.9" → 29'000. */
export const percentToPpm = (text: string) => parseDecimal(text, 4);
/** Francs text to rappen: "0.30" → 30. */
export const francsToMinor = (text: string) => parseDecimal(text, 2);
/** 29'000 ppm → "2.9%". */
export const ppmLabel = (ppm: number) => `${(ppm / 10_000).toFixed(4).replace(/\.?0+$/, '')}%`;
