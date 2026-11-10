export interface BridgeRequest {
  path: string;
  body: string;
  headers: Record<string, string>;
}
export function signSlack(secret: string, body: string, ts?: number): Record<'x-slack-request-timestamp' | 'x-slack-signature', string>;
export function toRequest(envelope: { type: string; envelope_id?: string; payload?: unknown }, secret: string): BridgeRequest | null;
