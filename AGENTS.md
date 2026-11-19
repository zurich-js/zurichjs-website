# AGENTS.md

Instructions for any coding or content agent working in this repository: Claude Code, Codex, Cursor, Copilot, Gemini and others. People should read them too. `CLAUDE.md` only imports this file.

zurichjs.com is the website of ZurichJS, the JavaScript community in Zurich: a static-first Astro 7 site on Netlify, with content in Sanity and the Sanity Studio in `apps/studio`, in one pnpm workspace.

## Read the docs first

Everything about this repository lives in the documentation, an Open Knowledge Format (OKF) v0.1 bundle in `docs/`. This file only points into it. Start at `docs/index.md`, then read the concepts for what you are about to change. Before any change, read the binding rules:

- `docs/conventions/working-rules.md`: what needs the owner, branches and PRs, checks before a commit, content edits, secrets
- `docs/systems/design-system/brand.md`: the brand rules (changing them needs the owner)
- `docs/systems/design-system/ui-rules.md`: the rules for every UI change, and its definition of done

Other starting points: `docs/systems/overview.md` (repository layout, packages, integrations), `docs/systems/local-development.md` (setup and commands), `docs/systems/operations/index.md` (deploys, environment variables, rebuilds, CI) and `docs/reference/decisions/index.md` (why things are the way they are).

When a change alters durable behaviour, update its concept in the same PR, add a line to `docs/log.md`, and put work that is not built yet in a Spec. The rules for writing the bundle are in `docs/conventions/authoring-guide.md`.

## Writing documentation: the `okf-documentation` skill

The bundle follows the `okf-documentation` skill in novu's skills repository on GitHub, teamnovu/novu-skills (under skills/dev/shared). It is not vendored here; if your agent has it installed, load it for any documentation work. Without it, the authoring guide covers everything you need.

- **Pick the mode by the task:**
  - **Feature planning** (something not built yet): create or update a Spec under the domain's or system's `specs/` folder, with requirements, acceptance criteria, affected concepts, open decisions and `status: planned` or `in-progress`. Link it from each affected concept under `# Related specs`, and back.
  - **Implementation:** update the concepts for the behaviour you built, in the same PR, in the present tense, with no branch names or "pending merge". Mark a Spec `shipped` only when its acceptance criteria are met, and move its facts into the concepts.
  - **Small fixes and regressions:** update a concept only if a durable fact changed. A styling tweak or restoring documented behaviour needs no Spec and no log entry.
  - **Audit:** check the requested pages and their direct links, and report findings without editing unless asked.
- **Before writing,** read the concepts you are about to touch and the authoring guide. Verify every fact against the code; where code and docs disagree, the code wins, and the correction goes in `docs/log.md`. Anything you cannot verify goes under "Open questions" or "Not verified".
- **One home per fact.** Use the table below to find it, link to it from elsewhere, and keep owner attributions on binding rules.
- **Before finishing,** run the checks in the authoring guide ("Checking the bundle"): frontmatter with a `type`, every `/…` link and backticked path resolves, every concept is in its folder's index, domain and system pages and Specs link both ways. There is no bundle linter in this repository, so check with a script or by hand, and say what you checked. `pnpm format:check` and `pnpm test` (`tools/agents.test.ts`) must pass.

| When you change                                             | Update                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Packages, apps, integrations, who owns a contract           | `docs/systems/overview.md`                                                       |
| Commands, `pnpm local`, mocks                               | `docs/systems/local-development.md`                                              |
| Rendering, routes, redirects, headers, share images         | `docs/systems/web.md` (and `docs/systems/seo.md` for any URL)                    |
| The Sanity schema, typegen, Studio scripts, the webhook     | `docs/systems/studio.md` and the domain's content model                          |
| Tokens, components, motion                                  | `docs/systems/design-system/` (brand rules need the owner)                       |
| Netlify, environment variables, rebuilds, CI, failures      | `docs/systems/operations/`                                                       |
| Stripe calls, the shared webhook, Stripe settings           | `docs/systems/stripe.md`                                                         |
| Tests, e2e, visual baselines                                | `docs/systems/testing.md`                                                        |
| The Slack agent, playbooks, roles, MCP                      | `docs/systems/slack-agent.md`                                                    |
| The CFP bot                                                 | `docs/systems/cfp-bot.md`                                                        |
| Event state, schedules, readiness, feedback, Meetup or Sane | `docs/domains/events/`                                                           |
| Membership, Stripe subscriptions, the admin area            | `docs/domains/membership/`                                                       |
| Sponsorships, the sponsor account and admin                 | `docs/domains/sponsorship/`                                                      |
| Content loading, singletons, sample content                 | `docs/domains/content/`                                                          |
| Partners and sponsorship                                    | `docs/domains/partners/overview.md`                                              |
| The talk proposal form or speaker profiles                  | `docs/domains/talk-proposals/overview.md`                                        |
| Forms and their destinations                                | `docs/domains/forms/overview.md`                                                 |
| Donations                                                   | `docs/domains/donations/overview.md`                                             |
| An owner decision                                           | `docs/reference/decisions/index.md` (append), and the concept that owns the rule |

## Playbooks and roles

Playbooks are plain markdown in the Agent Skills format in `agents/skills`; any agent can follow them, and Claude Code loads them through `.claude/skills`. Roles are in `agents/roles`. Both are described in `docs/systems/slack-agent.md`.

| Playbook                                | Use it to                                        |
| --------------------------------------- | ------------------------------------------------ |
| `agents/skills/new-event/SKILL.md`      | add a meetup                                     |
| `agents/skills/edit-event/SKILL.md`     | change a meetup (venue, date, status, programme) |
| `agents/skills/event-recap/SKILL.md`    | write up an event after it happened              |
| `agents/skills/rating-refresh/SKILL.md` | update the Meetup rating by hand                 |
| `agents/skills/release/SKILL.md`        | check a branch before asking for a merge         |
| `agents/skills/visual-review/SKILL.md`  | make the PR screenshots and recording            |
