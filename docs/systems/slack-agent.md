---
type: System
title: Slack content agent and agent tooling
description: How coding and content agents work in this repository, and how the organisers' Slack bot drafts meetup changes, answers membership questions and emails speakers, with what it can never do.
tags: [automation, slack, agents, llm]
timestamp: '2026-11-19T00:00:00Z'
---

# Slack content agent and agent tooling

Source: `packages/agent` (`@zurichjs/agent`), the functions `apps/web/netlify/functions/slack-events.mts`, `apps/web/netlify/functions/slack-agent-background.mts` and `apps/web/netlify/functions/slack-interactivity.mts`, the manifest `slack/manifest.yml`. The CFP bot shares the package but not the code path ([CFP bot](/systems/cfp-bot.md)).

## For coding and content agents (any tool)

- **`AGENTS.md`** is the entry point for every agent: it points into this bundle, starting with the [working rules](/conventions/working-rules.md), the [brand rules](/systems/design-system/brand.md) and the [UI rules](/systems/design-system/ui-rules.md). `CLAUDE.md` only imports it.
- **Playbooks** are in `agents/skills`, as plain markdown in the Agent Skills format. Claude Code loads them through the `.claude/skills` symlink; other tools read them from `AGENTS.md`.

  | Playbook         | Use it to                             |
  | ---------------- | ------------------------------------- |
  | `new-event`      | add a meetup                          |
  | `edit-event`     | change a meetup                       |
  | `event-recap`    | write up an event after it happened   |
  | `rating-refresh` | update the Meetup rating by hand      |
  | `release`        | check a branch before a merge         |
  | `visual-review`  | make the PR screenshots and recording |

- **Roles** are in `agents/roles`: `reviewer` (read-only review), `qa` (builds and tests in a browser) and `content-editor` (Sanity edits, drafts only). `.claude/agents` holds thin pointers to them.
- **MCP servers** are in `.mcp.json`, pinned. Each takes its token from your environment, never from a file. Cursor and VS Code read the same entries from `.cursor/mcp.json` and `.vscode/mcp.json`.

  | Server                                 | Token                           | Used for       |
  | -------------------------------------- | ------------------------------- | -------------- |
  | Sanity (hosted)                        | `SANITY_API_TOKEN`, Editor role | content        |
  | GitHub                                 | `GITHUB_TOKEN`                  | PRs and issues |
  | Playwright (`@playwright/mcp`, pinned) | none                            | browser QA     |

- **Content edits through Sanity** follow the same rules as the Slack agent: drafts first, and a person publishes.
- **No CI job calls an AI model** (owner). Agents run on people's own machines or accounts.

## The Slack content agent

Organisers write in plain language in a private ZurichJS Slack channel, and the bot updates the meetup content on the website. For example: "@ZurichJS Bot the next meetup is full", or "@ZurichJS Bot change the venue of the December meetup to …". It is the team's own bot, model-agnostic (owner, 2026-11-01): it uses the Vercel AI SDK, and the provider is chosen by environment variables (`openai`, `anthropic`, `openai-compatible`). The OpenAI and Anthropic clients always get an explicit base URL (`LLM_BASE_URL`, else the provider's own API) in `packages/agent/src/model.ts`: left unset, the AI SDK would read the `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` that Netlify's AI Gateway injects into every function, send the team's own key to the gateway, and fail with an empty 401 (18th November 2026). The CFP bot uses the same model setup.

### What happens

1. **Slack sends the message** to `/.netlify/functions/slack-events`. The function checks Slack's signature and that the message came from the organisers' channel, answers within Slack's 3 seconds, and hands the message to `slack-agent-background`, a Netlify Background Function (the hand-off is HMAC-signed with the Slack signing secret). **Only an @mention starts the bot**, in the channel and in threads alike (owner, 10th November 2026): to answer its question in a thread, mention it again. Replies without a mention are people talking to each other; the bot ignores them.
2. **The agent reads the thread** up to the mention and works out what changed. Messages in the thread that do not mention it are given to the model marked as context only: it can use them to understand the request, but never acts on them or takes them as confirmation. Its typed tools (`packages/agent/src/tools.ts`) can only find and read events, look up venues used before, create and change event drafts, and change the Twint note on the Support page, plus the programme, proposal and speaker tools below.
3. **It replies in the thread** with each changed field as before → after, a Studio link, a draft-preview link (if the preview site exists), and **Publish** and **Discard draft** buttons.
4. **Pressing Publish** (`slack-interactivity`): only people on `SLACK_PUBLISHER_IDS` can publish, and the draft must pass the readiness check ([Events](/domains/events/overview.md)); if anything is missing, the bot says what. It then publishes, and the publish webhook rebuilds the site in about 4 minutes.
5. **Discard** removes only the draft. The live page stays as it was.

Typed tools instead of the Sanity MCP give a field allowlist, draft-only writes (the store, `packages/agent/src/store.ts`, refuses any write that isn't a draft), a before → after change log, and Zurich-time conversion. The legacy `location` and `address` fields stay in sync with the venue, as the Studio asks.

### Help, talk proposals, speakers and the programme (owner, 10th November 2026)

- `@ZurichJS Bot help` (or `what can you do?`) answers at once with a fixed list, without calling the model (`helpText` in `packages/agent/src/prompt.ts`).
- **Talk proposals** (`packages/agent/src/programme.ts`): `talkProposals` counts them by status and lists them with likely duplicates; `updateProposals` sets statuses with a line in the review notes ("Duplicate of …"); `scheduleProposal` puts one on a meetup: it makes the talk, adds it to the running order at a position and marks the proposal scheduled.
- **Speakers:** `findSpeakers` (with `duplicates: true`, profiles that share a name, email, GitHub or LinkedIn). `mergeSpeakers` repoints every talk and proposal to the profile kept, fills its gaps from the duplicate and adds the duplicate's URL to `legacySlugs` (it redirects); the duplicate is hidden, never deleted. For spam or test profiles, `fillGaps: false` copies nothing.
- **Programme:** `getEvent` returns the talks in running order and the schedule as the site builds it (estimated when there is no agenda). `setEventProgramme` reorders talks and sets the agenda, with the organiser's times or `usualEvening` (the times the site already estimates); `updateTalkDraft` changes a talk's length, title or abstract. A missing start time is never defaulted; the bot asks.
- **Publishing:** several drafts from one request get one **Publish all** button. It checks every event's readiness first, then publishes speakers, talks, proposals and events in that order, and turns references made to a draft-only talk (weak, `_strengthenOnPublish`) into normal ones (`packages/agent/src/publish.ts`).
- Speaker emails and review notes never go to the model; emails are only compared in code. `findVenuesUsedBefore` says which meetups used each venue. The bot cannot see Meetup RSVPs.

### Telling speakers their talk is scheduled

When an organiser presses **Publish** (or **Publish all**) and a published meetup's running order gained a talk made from a talk proposal, the bot offers to email the speaker. This is plain code, with no model tool for it (`packages/agent/src/speaker-email.ts`).

1. **The card.** After publishing, the bot compares each published event's talks before and after. A talk that is new on the meetup, whose proposal (`talkSubmission`) points at it with `talkReference` and has the status `scheduled`, gets a card in the thread asking whether to let the speaker know. Cancelled and postponed meetups get no card. The card previews the email's key lines from Sanity (meetup, date, time, venue) and the speaker's email masked (a•••@example.com). Slack never sees the full address, and the model never sees it at all.
2. **Send email** (only `SLACK_PUBLISHER_IDS`) reads the talk, its speakers and their emails from Sanity again, and sends each speaker their own email through Resend (`talk-scheduled` in `packages/emails`, sent by `apps/web/src/server/talk-scheduled.ts`). The email gives the date, the time (doors only when the agenda has a timed doors line, otherwise the start) and the venue; if any of them is not in Sanity yet, it says "We'll confirm the details soon". It links the event page and, when `JWT_SECRET` is set, the speaker's private profile link (30 days) to check their bio and photo. Replies go to `FORMS_TO` (default hello@zurichjs.com).
3. **After sending,** the card says who sent it and when, and a line goes in the proposal's review notes. If the proposal has an open draft, the line is added to that draft; otherwise it is published at once.
4. **Never twice.** Each email has a Resend idempotency key per proposal, meetup and speaker (`talk-scheduled:<proposal>:<event>:<speaker>`, 24 hours at Resend), and Send checks the review notes first.
5. **Not now** marks the card as not sent; anyone in the channel can press it. If no speaker on the talk has an email in Sanity, the card says so and has no Send button.

Without `RESEND_API_KEY`, Send says email is not set up and changes nothing. Locally, with `MAILPIT_URL`, the email lands in Mailpit.

### Membership questions (owner, 10th November 2026)

In the same channel the bot answers questions about Verein members ("who is resigning?", "how many members do we have?", "is … paid up?").

- **It only reads** (`membershipOverview`, `findMembers` in `apps/web/src/server/membership-agent.ts`). It cannot change a membership.
- **Resigning members it finds get a card** under the reply, with **Confirm resignation** (while it waits for the board) and **Undo resignation**. These are plain code, and only `SLACK_MEMBERSHIP_APPROVER_IDS` can press them. The outcome is posted in the thread.
- **The model sees little personal data:** name, organisation, level, cycle, status and dates; never email addresses, notes or Stripe ids (the cards, built by code, show the email). Member names do go to the model provider (`LLM_PROVIDER`), which the privacy policy names; if the provider changes, the privacy policy must change too (owner).
- It needs the membership database (`DATABASE_URL`, or `MEMBERSHIP_DB_URL` locally). Without it, the bot still does content and says nothing about members.

### Sponsor questions

The bot also answers questions about sponsors ("who sponsors us right now?", "which sponsors are behind on payment?", "what does Acme still need?") with read-only tools in `apps/web/src/server/sponsor-agent.ts`. It cannot change a sponsorship: changes go through `/admin/sponsors` and the sponsor's own confirmation. The model sees company-level facts only (name, tier, plan, status, dates, contract on file, latest logo), never contact names, emails, notes or Stripe ids. Search matches company names only, companies that started on their own and never paid are left out, and company names are marked as data, never instructions ([Sponsorship](/domains/sponsorship/overview.md)).

### What it cannot do, by design

- **Publish on its own:** there is no publish tool; only a person's button press publishes.
- **Delete anything:** there is no delete tool, and Discard only removes drafts.
- **Change a URL slug** after an event exists. That needs the owner, because of SEO.
- **Touch design, code, legal pages, payments, or anything outside meetup content.**
- **Invent facts.** It asks when the date, venue or event is unclear, and its instructions require it to.

### Setup (owner, once)

1. **Slack:** api.slack.com/apps › Create New App › From a manifest; pick the ZurichJS workspace and paste `slack/manifest.yml`. Install it, then invite **@ZurichJS Bot** to the private organisers' channel.
2. **Sanity:** create an API token with the **Editor** role, named "ZurichJS Bot", so edits show under that name in the document history.
3. **Netlify environment variables:** the agent's block in [Environment variables](/systems/operations/environment.md).
4. **Check Netlify Background Functions** are on the site's plan: the agent runs as one, because a reply can take longer than Slack's 3 seconds.
5. **Try it from a terminal first,** against the `v2-preview` dataset: `SANITY_DATASET=v2-preview SANITY_AGENT_TOKEN=… LLM_PROVIDER=… LLM_MODEL=… LLM_API_KEY=… pnpm agent "the next meetup is full"`. It writes drafts only, like in Slack, and prints what changed.

### Try it locally (Socket Mode, no public URL)

The production app sends events to zurichjs.com. For a laptop, use a second app in Socket Mode: `tools/slack-dev.mjs` opens the socket and passes events, signed, to the local site's functions. The production bot is untouched.

1. Create the dev app from `slack/manifest.dev.yml` and install it.
2. Basic Information › App-Level Tokens › Generate, with `connections:write`: that is `SLACK_APP_TOKEN` (`xapp-…`).
3. Create a private test channel and invite **@ZurichJS Bot (dev)**.
4. In `.env` (git-ignored), set the dev app's `SLACK_APP_TOKEN`, `SLACK_AGENT_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_AGENT_CHANNEL_ID` (the test channel), your own Slack ID in `SLACK_PUBLISHER_IDS` and `SLACK_MEMBERSHIP_APPROVER_IDS`, an Editor `SANITY_AGENT_TOKEN`, `SANITY_DATASET=v2-preview` (never production from a laptop), and the `LLM_*` variables.
5. Run `pnpm local`. It starts the bridge when `SLACK_APP_TOKEN` is set (`[slack-dev] connected`). Mention **@ZurichJS Bot (dev)** in the test channel.

To try membership: join on `localhost:4321/membership` with a test card, resign on the account page, then ask the dev bot "who is resigning?" and press the buttons. Emails land in Mailpit, never in a real inbox.

**Cost:** model usage per message, typically a few cents per edit. Slack apps and Netlify Functions add nothing at this volume.

### Where the code lives

| Path                                        | What                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/agent/src/tools.ts`               | the tools (drafts only, field allowlist, change log)                                       |
| `packages/agent/src/store.ts`               | the only Sanity access; refuses any write that isn't a draft                               |
| `packages/agent/src/prompt.ts`              | the agent's instructions                                                                   |
| `packages/agent/src/playbooks.generated.ts` | the playbooks, generated from `agents/skills` by `tools/build-agent-prompt.mjs`            |
| `packages/agent/src/model.ts`               | picks the model from the environment variables                                             |
| `packages/agent/src/run.ts`                 | the agent loop                                                                             |
| `packages/agent/src/slack.ts`               | signatures, the Slack API, Block Kit                                                       |
| `packages/agent/src/publish.ts`             | the Publish and Discard buttons                                                            |
| `packages/agent/src/speaker-email.ts`       | the "your talk is scheduled" card, Send email and Not now                                  |
| `apps/web/src/server/talk-scheduled.ts`     | renders and sends that email (Resend, idempotency key, profile link)                       |
| `apps/web/src/server/membership-agent.ts`   | the read-only membership tools                                                             |
| `apps/web/src/server/sponsor-agent.ts`      | the read-only sponsorship tools                                                            |
| `packages/agent/test`                       | tests with an in-memory Sanity and a scripted model, so CI makes no network or model calls |

## Related concepts

- [CFP bot](/systems/cfp-bot.md), [System map](/systems/overview.md), [Environment variables](/systems/operations/environment.md)
- [Events](/domains/events/overview.md) (readiness, schedules), [Talk proposals](/domains/talk-proposals/overview.md), [Membership](/domains/membership/overview.md), [Sponsorship](/domains/sponsorship/overview.md), [Content](/domains/content/overview.md)

# Related specs

None.
