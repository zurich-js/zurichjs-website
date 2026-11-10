export interface MockEmail {
  id: string;
  at: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  attachments: { filename: string; content: string }[];
  idempotencyKey?: string;
}
export interface MockResend {
  url: string;
  emails: MockEmail[];
  close: () => Promise<void>;
}
export function startMockResend(port?: number): Promise<MockResend>;
