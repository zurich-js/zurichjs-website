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
