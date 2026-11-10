export interface MockStripeRequest {
  method: string;
  path: string;
  auth: string | undefined;
  idempotencyKey: string | undefined;
  version: string | undefined;
  form: Record<string, string>;
}
export interface MockStripe {
  url: string;
  sessions: Map<string, Record<string, unknown>>;
  requests: MockStripeRequest[];
  close: () => Promise<void>;
}
export function startMockStripe(port?: number): Promise<MockStripe>;

/** Membership fees in rappen by Stripe lookup key, as the mock prices them. */
export const MEMBER_FEES: Record<string, number>;
