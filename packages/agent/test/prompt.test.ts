import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generated } from '../../../tools/build-agent-prompt.mjs';

describe('playbooks in the Slack agent', () => {
  it('match agents/skills (run `node tools/build-agent-prompt.mjs` after editing them)', () => {
    expect(readFileSync(new URL('../src/playbooks.generated.ts', import.meta.url), 'utf8')).toBe(generated(new URL('../../../', import.meta.url)));
  });
});
