import { describe, expect, it, vi } from 'vitest';
import { membershipSlack } from '../src/server/membership-slack.ts';

const base = { SLACK_AGENT_BOT_TOKEN: 'xoxb-1', SLACK_AGENT_CHANNEL_ID: 'C1' };
const posted = async (env: Record<string, string | undefined>) => {
  const fetchImpl = vi.fn(async () => Response.json({ ok: true, ts: '1.2' }));
  const slack = membershipSlack({ ...base, ...env }, fetchImpl as unknown as typeof fetch);
  await slack.post('Ada joined', [{ type: 'section', text: { type: 'mrkdwn', text: 'Ada joined' } }]);
  await slack.reply('C1', '1.2', 'Done');
  return fetchImpl.mock.calls.map((c) => JSON.parse(String((c as unknown as [string, RequestInit])[1].body)) as { text: string; blocks?: { type: string }[] });
};

describe('membership notes in Slack say where they come from', () => {
  it('marks the text and the card outside production', async () => {
    const [post, reply] = await posted({ SLACK_ENV_LABEL: 'local' });
    expect(post!.text).toBe('`[local]` Ada joined');
    expect(post!.blocks!.map((b) => b.type)).toEqual(['context', 'section']);
    expect(reply!.text).toBe('`[local]` Done');
  });

  it('leaves production messages as they are', async () => {
    for (const env of [{}, { SLACK_ENV_LABEL: 'local', CONTEXT: 'production' }]) {
      const [post, reply] = await posted(env);
      expect(post!.text).toBe('Ada joined');
      expect(post!.blocks!.map((b) => b.type)).toEqual(['section']);
      expect(reply!.text).toBe('Done');
    }
  });
});
