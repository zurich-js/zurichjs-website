/**
 * The CFP bot's four tools, and nothing else. Each one is bound to ONE draft, whose owner comes
 * from the verified Slack event: the model never passes a user, thread or draft id, so it cannot
 * reach anyone else's draft. Values are checked with the website form's schema (schemas.cfp).
 *
 * submitMyDraft does not send anything: it only asks the host to show the private confirmation.
 * Sending is the Submit button, deterministic code in ./bot.ts.
 */
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { schemas } from '@zurichjs/forms';
import { MAX_TOPICS, TALK_LENGTHS, TALK_LEVELS, TALK_TOPICS, missingFields, type CfpFields } from './fields.ts';
import type { CfpDraft, CfpStore } from './store.ts';

/** Pinned by test/cfp-tools.test.ts: adding a tool here is a decision, not a side effect. */
export const CFP_TOOL_NAMES = ['getMyDraft', 'updateMyDraft', 'submitMyDraft', 'discardMyDraft'] as const;

/** What the tools did during one turn, for the host to act on. */
export class CfpTurnState {
  draft: CfpDraft | null;
  changed = false;
  confirm = false;
  discarded = false;
  constructor(draft: CfpDraft) {
    this.draft = draft;
  }
}

const shape = schemas.cfp.shape;

/** The talk fields the model may see: never the email, the photo answer or any Slack id. */
const visible = (f: CfpFields) => ({ ...f });

export function buildCfpTools(store: CfpStore, state: CfpTurnState): ToolSet & Record<(typeof CFP_TOOL_NAMES)[number], unknown> {
  const owner = () => {
    const d = state.draft;
    if (!d) throw new Error('No draft');
    return { team: d.team, user: d.user };
  };
  return {
    getMyDraft: tool({
      description: "The speaker's current draft and which required fields are still missing.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!state.draft) return { error: 'There is no draft any more. The speaker can start again by mentioning the bot in a new message.' };
        return { draft: visible(state.draft.fields), missing: missingFields(state.draft.fields) };
      },
    }),
    updateMyDraft: tool({
      description: "Set or change fields of the speaker's own draft. Only send the fields that change.",
      inputSchema: z.object({
        title: z.string().optional(),
        abstract: z.string().optional().describe('What people will learn, two to five sentences'),
        format: z
          .enum(TALK_LENGTHS.map((l) => l.value) as ['Lightning', 'Standard'])
          .optional()
          .describe('Lightning = 10 minutes, Standard = full talk, 20 minutes'),
        level: z.enum(TALK_LEVELS.map((l) => l.value) as ['beginner', 'intermediate', 'advanced']).optional(),
        topics: z.array(z.enum(TALK_TOPICS)).max(MAX_TOPICS).optional(),
        jobTitle: z.string().optional(),
        bio: z.string().optional(),
        firstTalk: z.boolean().optional(),
      }),
      execute: async (input) => {
        if (!state.draft) return { error: 'There is no draft any more.' };
        const next: CfpFields = { ...state.draft.fields };
        const errors: Record<string, string> = {};
        for (const [k, v] of Object.entries(input) as [keyof CfpFields, unknown][]) {
          if (v === undefined) continue;
          if (k === 'firstTalk') {
            next.firstTalk = v as boolean;
            continue;
          }
          const r = shape[k].safeParse(v);
          if (r.success) (next as Record<string, unknown>)[k] = r.data;
          else errors[k] = r.error.issues[0]?.message ?? 'Invalid';
        }
        const saved = await store.update(state.draft.id, owner(), { fields: next });
        if (!saved) return { error: 'This draft cannot be changed right now (it is being sent, or is gone).' };
        state.draft = saved;
        state.changed = true;
        return { draft: visible(saved.fields), ...(Object.keys(errors).length ? { rejected: errors } : {}), missing: missingFields(saved.fields) };
      },
    }),
    submitMyDraft: tool({
      description:
        'When every required field is set: shows the draft in the thread and a private confirmation to the speaker, who checks name, email and photo and presses Submit. This does NOT send the proposal.',
      inputSchema: z.object({}),
      execute: async () => {
        if (!state.draft) return { error: 'There is no draft any more.' };
        const missing = missingFields(state.draft.fields);
        if (Object.keys(missing).length) return { error: 'Not complete yet.', missing };
        state.confirm = true;
        return { ok: true, note: 'The speaker now sees a private confirmation with Submit and Keep editing. Tell them to check it. Nothing is sent until they press Submit.' };
      },
    }),
    discardMyDraft: tool({
      description: "Delete the speaker's draft, when they say they want to stop or start over.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!state.draft) return { ok: true };
        await store.remove(state.draft.id, owner());
        state.draft = null;
        state.discarded = true;
        state.confirm = false;
        return { ok: true };
      },
    }),
  };
}
