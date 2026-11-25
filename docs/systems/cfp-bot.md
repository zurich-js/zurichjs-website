---
type: System
title: CFP bot
description: The second Slack app, ZurichJS CFP, which lets anyone in the ZurichJS Slack write and send their own talk proposal in #cfp, and how it is kept apart from the organisers' bot.
tags: [automation, slack, talk-proposals, llm, security]
timestamp: '2026-11-19T00:00:00Z'
---

# CFP bot

Source: `packages/agent/src/cfp` (imported as `@zurichjs/agent/cfp`), `apps/web/src/server/cfp-bot.ts`, the functions `apps/web/netlify/functions/slack-cfp-events.mts`, `apps/web/netlify/functions/slack-cfp-background.mts`, `apps/web/netlify/functions/slack-cfp-interactivity.mts` and `apps/web/netlify/functions/slack-cfp-cleanup.mts`, the manifests `slack/manifest.cfp.yml` and `slack/manifest.cfp.dev.yml`, and the migration `apps/web/database/migrations/20261111120000_cfp_drafts.sql`.

Anyone in the ZurichJS Slack, guests included, can propose a talk by chatting with **@ZurichJS CFP** in the public `#cfp` channel. The bot shapes the proposal with them in a thread and submits it as a normal pending talk proposal, the same as the website form at `/cfp` ([Talk proposals](/domains/talk-proposals/overview.md)). It can do one thing only: help someone write and send **their own** proposal. It cannot read or change events, other people's proposals, speakers, members or anything else.

## Decisions (owner, 11th November 2026)

| Question                       | Decision                                                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Where the conversation happens | In a **public thread** in `#cfp`                                                                                                       |
| Same bot or a new one          | A **second Slack app**, "ZurichJS CFP", installed only in `#cfp`                                                                       |
| Name, email, photo             | **From the Slack profile:** name prefilled, email read from the profile, photo used only if the person agrees                          |
| AI model                       | The **cheapest** model, for this path only; the organiser bot keeps its own                                                            |
| Limits                         | At most **2 submissions per person per day**                                                                                           |
| Slack guests                   | **May submit**                                                                                                                         |
| Where the Slack ID is kept     | **Only in the review notes** ("Submitted via Slack by @name"); no schema change                                                        |
| Privacy and retention          | The privacy policy section "Talk Proposals in Slack" is approved, and unfinished drafts are deleted after **14 days** without activity |

## What happens

1. **Slack sends the mention** to `slack-cfp-events`. It checks the CFP app's signature, keeps to `SLACK_CFP_CHANNEL_ID`, ignores bots, edits and people from other workspaces, and hands the message to `slack-cfp-background`. Replies in the thread need no mention.
2. **The background function** starts a draft for the person who mentioned the bot (one open draft per person, one per thread) and runs one model turn with **exactly four tools**: `getMyDraft`, `updateMyDraft`, `submitMyDraft`, `discardMyDraft`. The tools are bound to that person's draft; the Slack user and thread come from the verified event, never from the model. Other people's messages in the thread reach the model marked as context only, and their mentions do nothing.
3. **The bot asks short questions** (lightning talk, 10 minutes, or full talk, 20 minutes; beginner, intermediate or advanced) and shows the draft in the thread: title, what people will learn, length and level, topics.
4. **When the draft is complete,** a confirmation only the speaker sees (`chat.postEphemeral`): their name and their email, masked ("from your Slack profile"), "Use your Slack photo on your speaker page?" (Yes / No), the speaker terms from the website form, and **Submit** and **Keep editing**. If the profile shows no email, an **Add email** button opens a private field (a modal). Pressing Submit accepts the terms, as the website's checkbox does.
5. **Submit** (`slack-cfp-interactivity`) is plain code, not the model. Only the person who started the draft can press it. It checks the draft with `schemas.cfp`, downloads the Slack photo only if they said Yes, and sends it through `forwardForm('cfp', …)`: the same speaker and pending `talkSubmission` as the website form, with "Submitted via Slack by <@U…>" in the review notes, and the usual organiser note saying "via Slack". The draft is deleted and the thread gets "Proposal received. The organisers will be in touch."

Organisers review the proposal like any other: the organiser bot's `talkProposals`, the Studio's convert-to-talk action, Publish.

**As built:** name, email and job title come from the Slack profile; the model never sees the name, the email or any Slack ID. The website form's extra profile rules (bio and LinkedIn for new speakers) do not apply to Slack proposals; organisers follow up if they need them. The photo is `image_original`, else `image_512`, only with a Yes, only from Slack's own image hosts, JPEG, PNG or WebP up to 5 MB; Slack's default avatar is never used, and the question is not asked when there is no photo.

## Safety, in code

- **Isolation:** the CFP code never imports the organiser bot (the rest of `packages/agent/src`: its tools, programme, loop, store, publish, prompt and Slack code) or the membership code. An oxlint `no-restricted-imports` rule (`.oxlintrc.json`) blocks direct imports, and `packages/agent/test/cfp-boundary.test.ts` follows every import from the CFP code and the `slack-cfp-*` functions and pins the four tool names.
- **No organiser credentials** on this path: no `SANITY_AGENT_TOKEN`, no organiser Slack token. Drafts live in Postgres, not Sanity; only Submit writes to Sanity, with the website form's token.
- **Owner only:** every draft write names its owner in SQL; buttons pressed by anyone else are refused.
- **Output escaped:** everything the model or a person wrote is escaped before it is posted (`verbatim` text, `&lt;`/`&gt;`, broken `@channel`/`@here` and URLs), so the bot cannot post a broadcast, a mention or a link.
- **Email private:** the model never sees an email; the confirmation shows it masked; it is never posted in the channel.
- **Limits** (in Postgres, `cfp_usage`, because the in-memory rate limiter is per function instance): 2 submissions per person per day, 30 messages per person per hour, and 400 model calls per day for everyone (`CFP_MAX_MODEL_CALLS_PER_DAY`). Unfinished drafts are deleted after 14 days without activity (`CFP_DRAFT_RETENTION_DAYS` in `packages/agent/src/cfp/limits.ts`; `slack-cfp-cleanup`, daily).
- **Cheapest model:** `CFP_LLM_MODEL`, with the organiser bot's `LLM_PROVIDER` and `LLM_API_KEY`. With Anthropic it defaults to `claude-haiku-5-5`. It never falls back to `LLM_MODEL`.

## Data

`cfp_drafts` and `cfp_usage` live in the membership Neon database (`DATABASE_URL`), through their own pool. A draft holds the Slack user, team and thread, the fields as `jsonb`, a status (`draft`, or `submitting` while a Submit is in progress, so a double click sends once) and timestamps. Submitted and expired drafts are deleted rather than kept. There is no separate database role; the CFP code only touches its own two tables.

## Switch it on (owner, once)

1. **Slack:** api.slack.com/apps › Create New App › From a manifest › the ZurichJS workspace › paste `slack/manifest.cfp.yml`. Install it, then invite **@ZurichJS CFP** to `#cfp` only. On Slack's free plan it takes one of the 10 app installs.
2. **Netlify environment variables:** `SLACK_CFP_BOT_TOKEN`, `SLACK_CFP_SIGNING_SECRET`, `SLACK_CFP_CHANNEL_ID`, and `CFP_LLM_MODEL` unless the provider is Anthropic ([Environment variables](/systems/operations/environment.md)). `LLM_PROVIDER`, `LLM_API_KEY`, `DATABASE_URL` and the form's Sanity and Slack variables are shared with the rest of the site.
3. **Deploy:** the `cfp_drafts` migration runs with the next build.
4. **Try it** in `#cfp`: mention the bot, answer, check the private confirmation, press Submit, and find the proposal in the Studio under talk proposals.

Without `SLACK_CFP_*` the functions answer Slack with 401 and do nothing; the rest of the site is unaffected.

## Try it locally

Like the organiser bot ([Slack content agent](/systems/slack-agent.md)): create a dev app from `slack/manifest.cfp.dev.yml`, add an app-level token with `connections:write`, invite **@ZurichJS CFP (dev)** to a test channel, and set `SLACK_CFP_APP_TOKEN`, `SLACK_CFP_BOT_TOKEN`, `SLACK_CFP_SIGNING_SECRET`, `SLACK_CFP_CHANNEL_ID` (the test channel), `LLM_PROVIDER`, `LLM_API_KEY`, `SANITY_DATASET=v2-preview` and a `SANITY_WRITE_TOKEN` in `.env`. Submit writes to that dataset; never production from a laptop. `just up` starts `tools/slack-dev.mjs`, which bridges either app or both. Drafts go to the Docker Postgres.

## Tests

`packages/agent/test/cfp-bot.test.ts`, `packages/agent/test/cfp-text.test.ts` and `packages/agent/test/cfp-boundary.test.ts` (flow, owner only, limits, email privacy, prompt injection, escaping, isolation), `apps/web/test/cfp-bot.test.ts` (the functions end to end with fake Slack, Sanity and model), `apps/web/test/cfp-db.test.ts` (the SQL on Postgres).

## Not verified

- Whether the owner has switched the bot on. It was built and not switched on as of 11th November 2026.

## Open questions

- Telling the person in their thread when their proposal is accepted was noted as optional, for later. Nothing is decided.

## Related concepts

- [Slack content agent](/systems/slack-agent.md), [Talk proposals](/domains/talk-proposals/overview.md), [Forms](/domains/forms/overview.md)
- [Environment variables](/systems/operations/environment.md), [Membership](/domains/membership/overview.md) (the shared database)

# Related specs

None.
