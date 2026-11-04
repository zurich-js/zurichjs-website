import { describe, expect, it } from 'vitest';
import { SITE, slackLink } from '../src/index.ts';

describe('the Slack link', () => {
  it('uses the invite from Site settings when it is complete', () => {
    const other = 'https://join.slack.com/t/zurichjs/shared_invite/zt-other-token-123';
    expect(slackLink({ slackInviteUrl: other } as never).href).toBe(other);
  });
  it("falls back to the site's own invite, never to a truncated link (owner, 4th November 2026)", () => {
    for (const slackInviteUrl of [undefined, 'https://join.slack.com/t/zurichjs/shared_invite/']) {
      const l = slackLink({ slackInviteUrl } as never);
      expect(l).toEqual({ href: SITE.slackInviteUrl, label: 'Join our Slack', external: true });
    }
  });
});
