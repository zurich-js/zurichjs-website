# Automation: agents, playbooks and the Slack content agent

This covers how coding agents and organisers use automation on zurichjs.com. The house rules every agent follows are in `AGENTS.md`.

## For coding and content agents (any tool)

- **`AGENTS.md`** is the single set of instructions: layout, commands, brand rules, what needs the owner, testing and PR rules. `CLAUDE.md` only imports it.
- **Playbooks** are in `agents/skills/*/SKILL.md`. They are plain markdown in the Agent Skills format.

  | Playbook         | Use it to                             |
  | ---------------- | ------------------------------------- |
  | `new-event`      | add a meetup                          |
  | `edit-event`     | change a meetup                       |
  | `event-recap`    | write up an event after it happened   |
  | `rating-refresh` | update the Meetup rating by hand      |
  | `release`        | check a branch before a merge         |
  | `visual-review`  | make the PR screenshots and recording |

  Claude Code loads them through the `.claude/skills` symlink. Other tools read them from `AGENTS.md`.

- **Roles** are in `agents/roles/`: `reviewer` (read-only review), `qa` (builds and tests in a browser) and `content-editor` (Sanity edits, drafts only). `.claude/agents/*` point to them.
- **MCP servers** are in `.mcp.json`. Each one takes its token from your environment, never from a file.

  | Server                                 | Token                           | Used for       |
  | -------------------------------------- | ------------------------------- | -------------- |
  | Sanity (hosted)                        | `SANITY_API_TOKEN`, Editor role | content        |
  | GitHub                                 | `GITHUB_TOKEN`                  | PRs and issues |
  | Playwright (`@playwright/mcp`, pinned) | none                            | browser QA     |

  Cursor and VS Code read the same entries from `.cursor/mcp.json` and `.vscode/mcp.json`. Copy them there if you use those tools.

- **No CI job calls an AI model,** by owner decision. Agents run on people's own machines or accounts.

## The Slack content agent

Organisers write in plain language in a private ZurichJS Slack channel, and the bot updates the meetup content on the website. For example:

> @ZurichJS Bot the next meetup is full
>
> @ZurichJS Bot change the venue of the December meetup to Smallpdf, Steinstrasse 21, 8003 Zürich
>
> @ZurichJS Bot add the January meetup: 20 January 2027, doors 18:30, at Venue AG, Meetup link https://www.meetup.com/zurich-js/events/…

### What happens

1. **Slack sends the message** to `/.netlify/functions/slack-events`. The function checks Slack's signature and that the message came from the organisers' channel, then hands it to `slack-agent-background`. **Only an @mention starts the bot**, in the channel and in threads alike (owner, 10th November 2026): to answer its question in a thread, mention it again. Replies without a mention are people talking to each other; the bot ignores them.
2. **The agent reads the thread** up to the mention and works out what changed. Messages in the thread that do not mention it are given to the model marked as context only: it can use them to understand the request, but never acts on them or takes them as confirmation. It uses `packages/agent`'s tools, which can only:
   - find events, read an event, and look up venues used before
   - create an event draft
   - change an event draft
   - change the Twint note on the Support page
3. **It replies in the thread** with each changed field as before → after, a Studio link, a draft-preview link (if the preview site exists), and **Publish** and **Discard draft** buttons.
4. **Pressing Publish** (`slack-interactivity`):
   - Only people on `SLACK_PUBLISHER_IDS` can publish.
   - The draft must pass the readiness check. If anything is missing, the bot says what.
   - It then publishes, and the normal webhook rebuilds the site in about 4 minutes.
5. **Discard** removes only the draft. The live page stays as it was.

### Help, talk proposals, speakers and the programme (owner, 10th November 2026)

- `@ZurichJS Bot help` (or `what can you do?`) answers at once with a fixed list, without calling the model (`helpText` in `packages/agent/src/prompt.ts`).
- **Talk proposals** (`packages/agent/src/programme.ts`): `talkProposals` counts them by status and lists them with likely duplicates; `updateProposals` sets statuses with a line in the review notes ("Duplicate of …"); `scheduleProposal` puts one on a meetup: it makes the talk, adds it to the running order at a position and marks the proposal scheduled.
- **Speakers:** `findSpeakers` (with `duplicates: true`, profiles that share a name, email, GitHub or LinkedIn). `mergeSpeakers` repoints every talk and proposal to the profile kept, fills its gaps from the duplicate and adds the duplicate's URL to `legacySlugs` (it redirects); the duplicate is hidden, never deleted. For spam or test profiles, `fillGaps: false` copies nothing.
- **Programme:** `getEvent` returns the talks in running order and the schedule as the site builds it (estimated when there is no agenda). `setEventProgramme` reorders talks and sets the agenda, with the organiser's times or `usualEvening` (the times the site already estimates); `updateTalkDraft` changes a talk's length, title or abstract.
- **Publishing:** several drafts from one request get one **Publish all** button. It checks every event's readiness first, then publishes speakers, talks, proposals and events in that order, and turns references made to a draft-only talk (weak, `_strengthenOnPublish`) into normal ones (`packages/agent/src/publish.ts`).
- Speaker emails and review notes never go to the model; emails are only compared in code. Venues: `findVenuesUsedBefore` says which meetups used each venue. The bot cannot see Meetup RSVPs.

### Membership questions (owner, 10th November 2026)

In the same channel the bot answers questions about Verein members, for example:

> @ZurichJS Bot who is resigning?
>
> @ZurichJS Bot how many members do we have?
>
> @ZurichJS Bot is Ada Lovelace paid up?

- **It only reads** (`membershipOverview`, `findMembers` in `apps/web/src/server/membership-agent.ts`). It cannot change a membership.
- **Resigning members it finds get a card** under the reply, with **Confirm resignation** (while it waits for the board) and **Undo resignation**. These are plain code, not the model, and only `SLACK_MEMBERSHIP_APPROVER_IDS` can press them. The outcome is posted in the thread. The resignation cards the site posts also have Undo now.
- **The model sees little personal data:** name, organisation, level, cycle, status and dates. It never sees email addresses, notes or Stripe ids; the cards (built by our code) show the email. Even so, member names go to the model provider (`LLM_PROVIDER`); the privacy policy should name that provider (legal pages: owner).
- It needs the membership database (`NETLIFY_DB_URL`, or `MEMBERSHIP_DB_URL` locally). Without it, the bot still does content and says nothing about members.

### What it cannot do, by design

- **Publish on its own:** there is no publish tool; only a person's button press publishes.
- **Delete anything:** there is no delete tool, and Discard only removes drafts.
- **Change a URL slug** after an event exists. That needs the owner, because of SEO.
- **Touch design, code, legal pages, payments, or anything outside meetup content.**
- **Invent facts.** It asks when the date, venue or event is unclear, and the instructions require it to.

### Setup (owner, once)

1. **Slack:** go to api.slack.com/apps › Create New App › From a manifest. Pick the ZurichJS workspace and paste `slack/manifest.yml`. Install it to the workspace, then invite **@ZurichJS Bot** to the private organisers' channel.
2. **Sanity:** create an API token with the **Editor** role, named "ZurichJS Bot". Edits then show under that name in the document history.
3. **Netlify environment variables** (zurichjs.com site):

   | Variable                        | Value                                                                                                |
   | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
   | `SLACK_AGENT_BOT_TOKEN`         | Bot User OAuth Token (`xoxb-…`) from the Slack app                                                   |
   | `SLACK_SIGNING_SECRET`          | Signing Secret from the Slack app's Basic Information                                                |
   | `SLACK_AGENT_CHANNEL_ID`        | the private channel's ID, e.g. `C0123ABCD` (channel details › About)                                 |
   | `SLACK_PUBLISHER_IDS`           | Slack member IDs allowed to publish, comma-separated                                                 |
   | `SANITY_AGENT_TOKEN`            | the Editor token from step 2                                                                         |
   | `LLM_PROVIDER`                  | `openai`, `anthropic` or `openai-compatible`                                                         |
   | `LLM_MODEL`                     | a model ID from that provider                                                                        |
   | `LLM_API_KEY`                   | that provider's API key                                                                              |
   | `LLM_BASE_URL`                  | for `openai-compatible` (Mistral, Groq, OpenRouter, a local server)                                  |
   | `SANITY_STUDIO_URL`             | optional, default `https://zurichjs.sanity.studio`                                                   |
   | `DRAFT_PREVIEW_URL`             | optional, the draft preview site                                                                     |
   | `SLACK_MEMBERSHIP_CHANNEL_ID`   | optional: the private channel for membership cards and notes; else `SLACK_AGENT_CHANNEL_ID`          |
   | `SLACK_MEMBERSHIP_APPROVER_IDS` | who may confirm or undo resignations: Nadja `U08NAFH955M`, Bogdan `U08NDGCRYPK`, Faris `U08MMPMNLKZ` |

4. **Check Netlify Background Functions.** The agent runs as one, because a reply can take longer than Slack's 3-second limit. Confirm that the site's Netlify plan includes them.
5. **Try it first from a terminal**, against the `v2-preview` dataset:

   ```bash
   SANITY_DATASET=v2-preview SANITY_AGENT_TOKEN=… LLM_PROVIDER=… LLM_MODEL=… LLM_API_KEY=… pnpm agent "the next meetup is full"
   ```

   This writes drafts only, like in Slack, and prints what changed.

### Try it locally (Socket Mode, no public URL)

The production app sends events to zurichjs.com. For your machine, use a second app in **Socket Mode**: Slack sends events over a socket that `tools/slack-dev.mjs` opens from your laptop, and the bridge passes them, signed, to the local site's functions. The production bot is untouched.

1. **Create the dev app:** api.slack.com/apps › Create New App › From a manifest › paste `slack/manifest.dev.yml`. Install it to the workspace.
2. **App-level token:** Basic Information › App-Level Tokens › Generate, with the `connections:write` scope. This is `SLACK_APP_TOKEN` (`xapp-…`).
3. **A test channel:** a private channel only for this (e.g. `#zurichjs-bot-dev`), and invite **@ZurichJS Bot (dev)** to it.
4. **In `.env`** (git-ignored), with the dev app's values:

   ```
   SLACK_APP_TOKEN=xapp-…                 # Basic Information › App-Level Tokens
   SLACK_AGENT_BOT_TOKEN=xoxb-…           # OAuth & Permissions › Bot User OAuth Token
   SLACK_SIGNING_SECRET=…                 # Basic Information › Signing Secret
   SLACK_AGENT_CHANNEL_ID=C…              # the test channel (channel details › About)
   SLACK_MEMBERSHIP_APPROVER_IDS=U08MMPMNLKZ   # you, so you can press the buttons
   SLACK_PUBLISHER_IDS=U08MMPMNLKZ
   SANITY_AGENT_TOKEN=…                   # an Editor token; drafts only
   SANITY_DATASET=v2-preview              # never production from a laptop
   LLM_PROVIDER=anthropic
   LLM_MODEL=…
   LLM_API_KEY=…
   ```

5. **Run** `pnpm local`. It starts the site, Stripe test mode and, because `SLACK_APP_TOKEN` is set, the bridge (`[slack-dev] connected`). Mention **@ZurichJS Bot (dev)** in the test channel.

To try membership: join on `localhost:4321/membership` with a test card, resign on the account page, then ask the dev bot "who is resigning?" and press the buttons. Resignation cards and notes go to `SLACK_MEMBERSHIP_CHANNEL_ID`, or else the test channel. Emails to members and to hello@zurichjs.com land in Mailpit (`localhost:8025`), never in a real inbox.

**Cost:** model usage per message, typically a few cents per edit. Slack apps and Netlify Functions add nothing at this volume. Switching the model to another provider is only a change of environment variables.

### Where the code lives

| Path                                        | What                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/agent/src/tools.ts`               | the tools (drafts only, field allowlist, change log)                                       |
| `packages/agent/src/store.ts`               | the only Sanity access; refuses any write that isn't a draft                               |
| `packages/agent/src/prompt.ts`              | the agent's instructions                                                                   |
| `packages/agent/src/playbooks.generated.ts` | the playbooks, generated from `agents/skills` by `tools/build-agent-prompt.mjs`            |
| `packages/agent/src/model.ts`               | picks the model from the environment variables                                             |
| `packages/agent/src/slack.ts`               | signatures, the Slack API, Block Kit                                                       |
| `packages/agent/src/publish.ts`             | the Publish and Discard buttons                                                            |
| `apps/web/netlify/functions/slack-*.mts`    | the three Netlify Functions                                                                |
| `packages/agent/test/*`                     | tests with an in-memory Sanity and a scripted model, so CI makes no network or model calls |
