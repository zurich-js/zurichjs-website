export interface BridgeRequest {
  path: string;
  body: string;
  headers: Record<string, string>;
}
export function signSlack(secret: string, body: string, ts?: number): Record<'x-slack-request-timestamp' | 'x-slack-signature', string>;
export interface BridgeApp {
  name: string;
  token: string;
  secret: string;
  prefix: string;
}
export const APPS: { agent: BridgeApp; cfp: BridgeApp };
export function toRequest(envelope: { type: string; envelope_id?: string; payload?: unknown }, secret: string, prefix?: string): BridgeRequest | null;
