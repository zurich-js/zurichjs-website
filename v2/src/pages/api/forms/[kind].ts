import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Form intake. Validates the fields each form requires, then returns ok.
 * Forwarding (email via Resend, Slack webhook, Sanity talkSubmission, Stripe
 * Checkout session) plugs in at the marked spots.
 */
const REQUIRED: Record<string, string[]> = {
  cfp: ['name', 'email', 'title', 'format'],
  partners: ['org', 'name', 'email', 'way'],
  contact: ['name', 'email', 'topic', 'message'],
  feedback: ['eventId', 'overall'],
  rating: ['eventId', 'target', 'stars'],
  waitlist: ['eventId', 'email'],
  checkout: ['eventId', 'qty', 'name', 'email'],
  donate: ['amountChf', 'method'],
};

const isEmail = (v: unknown) => typeof v === 'string' && /^\S+@\S+\.\S+$/.test(v.trim());

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const kind = String(req.query.kind);
  const required = REQUIRED[kind];
  if (!required) return res.status(404).json({ ok: false, error: 'Unknown form' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const missing = required.filter((k) => body[k] === undefined || body[k] === null || body[k] === '');
  if (missing.length) return res.status(400).json({ ok: false, error: `Missing: ${missing.join(', ')}` });
  if ('email' in body && body.email && !isEmail(body.email)) return res.status(400).json({ ok: false, error: 'Invalid email' });

  const id = `${kind}_${Date.now().toString(36)}`;

  switch (kind) {
    case 'checkout':
      // TODO: create a Stripe Checkout session for the workshop's stripePriceId and return its URL.
      return res.status(200).json({ ok: true, id, url: null });
    case 'donate':
      // TODO: create a Stripe Checkout session (Twint or card) for `amountChf`.
      return res.status(200).json({ ok: true, id, url: null });
    default:
      // TODO: forward to email / Slack / Sanity.
      return res.status(200).json({ ok: true, id });
  }
}
