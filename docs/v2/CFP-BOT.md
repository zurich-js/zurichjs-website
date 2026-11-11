# Talk proposals in Slack: the CFP bot

**Status: built, not switched on** (11th November 2026). The code, tests and docs are in place; it does nothing until the owner creates the Slack app and sets its variables ("Switch it on" below). The plan follows as it was decided (owner, 11th November 2026), with notes where the build settled a detail. Anyone in the ZurichJS Slack can propose a talk by chatting with a bot in a public `#cfp` channel. The bot shapes the proposal with them in a thread and submits it as a normal pending talk proposal, the same as the website form at `/cfp`. Organisers review and publish it with the tools they already use.

The bot in `#cfp` can do one thing only: help someone write and submit **their own** talk proposal. It cannot read or change events, other people's proposals, speakers, members or anything else.

## Decisions (owner, 11th November 2026)

| Question                       | Decision                                                                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where the conversation happens | In a **public thread** in `#cfp`                                                                                                                                                   |
| Same bot or a new one          | A **second Slack app**, "ZurichJS CFP", installed only in `#cfp`                                                                                                                   |
| Name, email, photo             | **From the Slack profile:** name prefilled, email read from the profile, photo used only if the person agrees                                                                      |
| AI model                       | The **cheapest** model, for this path only; the organiser bot keeps its own                                                                                                        |
| Limits                         | At most **2 submissions per person per day**                                                                                                                                       |
| Slack guests                   | **May submit**                                                                                                                                                                     |
| Where the Slack ID is kept     | **Only in the review notes** ("Submitted via Slack by @name"); no schema change                                                                                                    |
| Still open                     | Privacy policy wording (a legal page, so the owner approves it); how long unfinished drafts are kept (built as 14 days without activity, one constant: `CFP_DRAFT_RETENTION_DAYS`) |

## How it works

1. Someone mentions `@ZurichJS CFP` in `#cfp`. The bot answers in a thread and asks for the talk: title, what people will learn, length (lightning or full talk), level and topics, the same fields as the website form (`schemas.cfp` in `packages/forms/src/index.ts`).
2. The conversation shapes a **draft**, which the person can change as often as they like until they submit. Only the person who started the thread can change their draft.
3. When they are ready, the bot shows a confirmation **only to them** (an ephemeral message or a Slack modal), with:
   - every field, as it will be submitted, checked against `schemas.cfp`;
   - their name and email from the Slack profile (if the profile shows no email, the bot asks for one here);
   - "Use your Slack photo on your speaker page?" (yes or no);
   - **Submit** and **Keep editing** buttons.
4. **Submit** is deterministic code, not the model. It creates the speaker and the pending `talkSubmission` through the existing `sanityTalkProposals` (`packages/integrations/src/index.ts`), uploads the Slack photo if they agreed, and posts the usual new-proposal note to the organisers' channel, with "via Slack" added.
5. The bot replies in the thread: proposal received, what happens next. The email is never posted in the channel.

There is no website step: no private link, no completion page.

## Keeping the public out (in code, not in the prompt)

The organiser bot (`packages/agent/src/run.ts`) loads every organiser tool on every turn, and its Sanity token can read everything. Adding `#cfp` to it would expose all of that. The CFP bot is therefore a separate path:

- **A second Slack app**, with its own token, signing secret and functions (`slack-cfp-events.mts`, `slack-cfp-background.mts`). It is installed only in `#cfp`, so a leaked or confused token cannot reach the organiser channel.
- **Its own code:** `packages/agent/src/cfp/` with `runCfpTurn`, its own prompt and exactly four tools: `getMyDraft`, `updateMyDraft`, `submitMyDraft`, `discardMyDraft`. The Slack user ID comes from the verified Slack event, never from the model. It never imports `tools.ts`, `programme.ts` or `membership-agent.ts`. An import-boundary lint rule and a test that pins the four tool names keep it that way.
- **No organiser credentials** on this path: no `SANITY_AGENT_TOKEN`, no membership database access. Drafts live in their own Postgres table with its own database role. Only the submit step writes to Sanity, through the same write client the website form uses.
- **Prompt injection:** the model sees only the current thread and that person's own draft, so the worst case is a strange draft under the attacker's own name. The bot's output is escaped, so it cannot post `@channel`, mentions or links. Messages from other people in the thread are not instructions.
- **Bots and other workspaces** are ignored. Guests are allowed.

## Data

- **Drafts:** a `cfp_drafts` table in the membership Postgres (Neon), migrated like the others (`apps/web/database/migrations`):
  - the Slack user and team IDs, and the thread;
  - the fields, as `jsonb`;
  - a status: `draft`, `submitted` or `expired`;
  - timestamps.

  One open draft per person. A draft is deleted once it is submitted, and unfinished drafts are deleted after the retention period the owner chooses.

- **Not Sanity** until submit, so organisers and the Studio see only real submissions, and the public path never holds a Sanity token.
- **The Slack ID** goes into the submission's review notes only.

## Limits and cost

Stored in Postgres, because `rateLimit.ts` is per function instance and kept in memory only:

- at most **2 submissions per person per day**;
- a cap on messages per person per hour (suggestion: 30);
- a global daily cap on model calls, which also caps cost.

The model for this path is the cheapest one available from the configured provider.

## Slack app

A new manifest, `slack/manifest.cfp.yml` (the existing `slack/manifest.yml` is unchanged):

- **Scopes:** `app_mentions:read`, `chat:write`, `channels:history` (to read the thread), `users:read` and `users:read.email` (name, email and photo from the profile), `files:read` if needed for the photo.
- **Events:** `app_mention`, `message.channels` (thread replies in `#cfp` only).
- **Interactivity:** for the confirmation buttons or modal.

On Slack's free plan, the second app takes one of the 10 app installs. Drafts live in Postgres, so the 90-day history limit does not matter.

## Organisers

Nothing new to build. A Slack submission is a normal pending `talkSubmission`, so all of these work as they do now:

- the organiser bot's `talkProposals`, `updateProposals` and `scheduleProposal` (`packages/agent/src/programme.ts`);
- the Studio's convert-to-talk action;
- the Publish button (`packages/agent/src/publish.ts`).

The new-proposal note in the organisers' channel says it came via Slack.

Optional, later: tell the person in their thread when their proposal is accepted.

## Privacy

The privacy policy (`apps/web/src/content/policies/privacy-policy.md`) needs a line saying that talk proposals written in Slack are processed by the AI provider, and that we read the name, email and photo from the Slack profile. It is a legal page, so the owner approves the wording.

## Effort

| Part                                                                           | Days       |
| ------------------------------------------------------------------------------ | ---------- |
| Second Slack app: manifest, events and background functions                    | 1.5        |
| `cfp_drafts` table, role, store, limits                                        | 1.5        |
| Prompt, the four tools, confirmation, Slack profile and photo, injection tests | 2.5        |
| Connecting submit to `sanityTalkProposals`, the organiser note                 | 0.5        |
| Docs (`AUTOMATION.md`, `RUNBOOK.md`), privacy policy text, tests               | 1          |
| **Total**                                                                      | **6 to 7** |

**Risks:**

- **Model cost from abuse:** the daily cap handles it.
- **Someone later reusing `runTurn`** for this path, which would expose the organiser tools: the import-boundary test guards against it.
- **Public threads:** they show the draft to the whole channel; the email and the confirmation stay private.

Build it in its own branch and PR, as `AGENTS.md` asks.

## Switch it on (owner)

1. **Create the Slack app:** api.slack.com/apps › Create New App › From a manifest › the ZurichJS workspace › paste `slack/manifest.cfp.yml`. Install it to the workspace.
2. **Invite @ZurichJS CFP to `#cfp`** only.
3. **Netlify environment variables** (production): `SLACK_CFP_BOT_TOKEN` (OAuth & Permissions › Bot User OAuth Token), `SLACK_CFP_SIGNING_SECRET` (Basic Information › Signing Secret), `SLACK_CFP_CHANNEL_ID` (`#cfp` › channel details › About). With `LLM_PROVIDER=anthropic` the model defaults to `claude-haiku-5-5`; for another provider, also set `CFP_LLM_MODEL`. Everything else (`LLM_API_KEY`, `DATABASE_URL`, `SANITY_TOKEN`, the organiser note's Slack variables) is already set.
4. **Approve the privacy policy text** added in `apps/web/src/content/policies/privacy-policy.md` (or change it).
5. **Confirm** the 14-day retention for unfinished drafts, or say another number.
6. **Deploy and try it:** the `cfp_drafts` migration runs with the build. Mention the bot in `#cfp`, answer, press Submit on the private confirmation, and check the proposal in the Studio.

Details: [AUTOMATION.md](./AUTOMATION.md), "The CFP bot"; variables: [RUNBOOK.md](./RUNBOOK.md), "CFP bot in Slack".

## As built

- **Code:** `packages/agent/src/cfp/` (`@zurichjs/agent/cfp`): `runCfpTurn`, its prompt, the four tools, the deterministic Submit (`bot.ts`), the draft store and limits, Slack calls and escaping. Functions: `apps/web/netlify/functions/slack-cfp-events.mts`, `slack-cfp-background.mts`, `slack-cfp-interactivity.mts`, and `slack-cfp-cleanup.mts` (daily, deletes expired drafts).
- **Confirmation:** an ephemeral message (`chat.postEphemeral`). The email is shown masked (`g•••@example.com`, "from your Slack profile"). Without a profile email, an **Add email** button opens a modal only the speaker sees. The speaker terms from the website form ("travel and accommodation can't be covered…") are shown above Submit; pressing Submit accepts them, as the website's checkbox does.
- **Fields:** checked with `schemas.cfp`. Name, email and job title come from the Slack profile; the model never sees the name, the email or any Slack ID. The website form's extra profile rules (bio and LinkedIn for new speakers) do not apply to Slack proposals; organisers follow up if they need them.
- **Photo:** `image_original`, else `image_512`, only when they chose Yes, only from Slack's own image hosts, JPEG, PNG or WebP up to 5 MB (the website's rules). Slack's default avatar is never used, and the question is not asked when there is no photo.
- **Database:** `cfp_drafts` and `cfp_usage` in the same Neon database as membership (`DATABASE_URL`), through their own pool. No separate database role yet; it could be added later, but the CFP code only ever touches its own two tables.
- **Statuses:** `draft` and `submitting` (a Submit in progress, so a double click sends once). Submitted and expired drafts are deleted rather than kept with a status.
- **Isolation:** an oxlint `no-restricted-imports` rule for the CFP files and a test that follows every import from them (`packages/agent/test/cfp-boundary.test.ts`), which also pins the four tool names.
- **Tests:** `packages/agent/test/cfp-*.test.ts` (flow, owner only, limits, email privacy, prompt injection, escaping), `apps/web/test/cfp-bot.test.ts` (the functions end to end with fake Slack, Sanity and model), `apps/web/test/cfp-db.test.ts` (the SQL on Postgres).

## Key files today

- **Organiser bot:** `packages/agent/src/run.ts` and `store.ts`, `apps/web/netlify/functions/slack-events.mts` and `slack-agent-background.mts`
- **Website CFP:**
  - `apps/web/src/components/islands/forms/CfpForm.tsx`
  - `packages/forms/src/index.ts` (`schemas.cfp`)
  - `packages/integrations/src/index.ts` (`forwardForm`, `sanityTalkProposals`)
- **Slack apps:** `slack/manifest.yml`, `slack/manifest.dev.yml`; how the bot works: `docs/v2/AUTOMATION.md`
