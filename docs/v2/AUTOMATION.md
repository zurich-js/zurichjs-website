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

1. **Slack sends the message** to `/.netlify/functions/slack-events`. The function checks Slack's signature and that the message came from the organisers' channel, then hands it to `slack-agent-background`.
2. **The agent reads the thread** and works out what changed. It uses `packages/agent`'s tools, which can only:
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

   | Variable                 | Value                                                                |
   | ------------------------ | -------------------------------------------------------------------- |
   | `SLACK_AGENT_BOT_TOKEN`  | Bot User OAuth Token (`xoxb-…`) from the Slack app                   |
   | `SLACK_SIGNING_SECRET`   | Signing Secret from the Slack app's Basic Information                |
   | `SLACK_AGENT_CHANNEL_ID` | the private channel's ID, e.g. `C0123ABCD` (channel details › About) |
   | `SLACK_PUBLISHER_IDS`    | Slack member IDs allowed to publish, comma-separated                 |
   | `SANITY_AGENT_TOKEN`     | the Editor token from step 2                                         |
   | `LLM_PROVIDER`           | `openai`, `anthropic` or `openai-compatible`                         |
   | `LLM_MODEL`              | a model ID from that provider                                        |
   | `LLM_API_KEY`            | that provider's API key                                              |
   | `LLM_BASE_URL`           | for `openai-compatible` (Mistral, Groq, OpenRouter, a local server)  |
   | `SANITY_STUDIO_URL`      | optional, default `https://zurichjs.sanity.studio`                   |
   | `DRAFT_PREVIEW_URL`      | optional, the draft preview site                                     |

4. **Check Netlify Background Functions.** The agent runs as one, because a reply can take longer than Slack's 3-second limit. Confirm that the site's Netlify plan includes them.
5. **Try it first from a terminal**, against the `v2-preview` dataset:

   ```bash
   SANITY_DATASET=v2-preview SANITY_AGENT_TOKEN=… LLM_PROVIDER=… LLM_MODEL=… LLM_API_KEY=… pnpm agent "the next meetup is full"
   ```

   This writes drafts only, like in Slack, and prints what changed.

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
