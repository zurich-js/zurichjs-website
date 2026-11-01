import { describe, expect, it, vi } from 'vitest';
import { forwardForm, type TalkProposalSink } from '../src';

const now = () => new Date('2026-11-01T10:00:00Z');

describe('forwardForm without secrets', () => {
  it('succeeds with logged stubs so the site works before integrations are configured', async () => {
    const log = vi.fn();
    const r = await forwardForm('contact', { name: 'Ada', email: 'ada@example.com', topic: 'Other', message: 'Hi' }, { env: {}, log, now, sanity: null });
    expect(r).toEqual({ ok: true, id: expect.stringMatching(/^contact_/) });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('RESEND_API_KEY missing'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('SLACK_WEBHOOK_URL missing'));
  });
});

describe('talk proposals', () => {
  it('go through the TalkProposalSink seam', async () => {
    const submit = vi.fn(async () => ({ id: 'sub_1' }));
    const sink: TalkProposalSink = { submit };
    const r = await forwardForm(
      'cfp',
      { name: 'Ada', email: 'ada@example.com', title: 'Typed forms', format: 'Lightning talk', abstract: 'A' },
      { env: {}, proposals: sink, log: () => {}, now, sanity: null },
    );
    expect(r).toEqual({ ok: true, id: 'sub_1' });
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Typed forms', format: 'Lightning talk', abstract: 'A' }));
  });
});
