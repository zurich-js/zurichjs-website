---
type: System
title: Rebuilds
description: What triggers a build of the static site, how Sanity publishes are debounced, how event state changes reach the HTML, and how to force a build.
tags: [operations, netlify, sanity, rebuilds]
timestamp: '2026-11-24T00:00:00Z'
---

# Rebuilds

The site is static, so content changes appear only after a rebuild.

| Trigger                            | Path                                                                                                                                                                                                                                                                                                                                                                                                             | Delay                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Publish in Sanity                  | The webhook calls `/api/rebuild`, which records a pending build in Netlify Blobs. `scheduled-rebuild` runs every 2 minutes and calls the build hook once nothing has been published for 2 minutes, so ten quick publishes produce one build, or once the first unbuilt publish is 15 minutes old, so steady publishing is still built.                                                                           | 2–4 min, plus the build |
| An event's start, and start + 48 h | `scheduled-rebuild` reads `/state-changes.json`, which each build writes, and builds once per time. That build moves the event page to its live and feedback state, then to the recap.                                                                                                                                                                                                                           | ≤ 2 min, plus the build |
| A sponsorship changes              | A sponsorship that starts, ends, changes tier, has its partner id, company name or website changed, or (running and one-time) has its meetups moved records a pending build in the same Blobs store (`apps/web/src/server/sponsor-rebuild.ts`), from whoever made the change: the sponsor, the board, Stripe's webhook or the daily check. `scheduled-rebuild` builds once things have been quiet for 2 minutes. | 2–4 min, plus the build |
| Code merged to `main`              | Netlify builds automatically.                                                                                                                                                                                                                                                                                                                                                                                    | the build               |

- **No nightly rebuild** (owner, 2026-11-01).
- **Between rebuilds,** the event islands re-check the clock in the browser, so the buttons people can press are always right ([Events](/domains/events/overview.md)). Older docs say "doors" for these times; they mean the event's `datetime`, its start.
- **The webhook** is an Astro endpoint, so it follows the same routing as `/api/forms/*`; only the timer is a Netlify Function.
- **Signature:** the same scheme as `@sanity/webhook`: `t=<ms>,v1=<base64url HMAC-SHA256 of "<t>.<body>">`, with a 5-minute replay window. Unsigned or stale requests get a 401.
- **The pending state is written only after the build hook accepts the request,** so a failed hook retries on the next tick.
- **A publish is a write of its own.** The webhook and a sponsorship change each save a separate `publish/<time>/<id>` blob, with no condition, so another writer cannot make it fail (`apps/web/src/server/rebuild-store.ts`). The tick's read counts those blobs into the state. Its save is conditional on the state's ETag, read with strong consistency. When another writer saved in between, the change is applied again to the newer state, up to five times. Once a save has counted a publish blob, the blob is deleted. A publish counter tells publishes apart, so one that arrives while the build hook call is in flight stays pending and gets a build of its own. The tick merges what it saves after the hook call (fired times less those a week older than the later build time, and the later build time), so a slow tick takes nothing back from a newer one. Nothing reserves a decision before the hook, so two ticks that reach the same decision (an invocation started twice, or one delayed past the next) both call it.
- **`/state-changes.json`** lists the start and start + 48 h times still ahead (`stateChangeTimes` in `packages/events/src/state.ts`). The scheduled function reads it from the deployed site, so the build alone decides when the next rebuild is due. Cancelled, postponed and TBC events add no times.

**Where the code lives:**

- the logic and its tests: `apps/web/src/server/rebuild.ts`
- the state in Netlify Blobs: `apps/web/src/server/rebuild-store.ts`
- the webhook: `apps/web/src/pages/api/rebuild.ts`
- the timer: `apps/web/netlify/functions/scheduled-rebuild.mts`
- sponsorship changes: `apps/web/src/server/sponsor-rebuild.ts`, tested in `apps/web/test/sponsor-rebuild.test.ts`

**To force a rebuild:** in Netlify, Deploys › Trigger deploy, or `curl -X POST "$NETLIFY_BUILD_HOOK_URL?trigger_title=Manual"`.

**The sponsorships database** is read only at build time, for who is a current sponsor and at which tier ([Sponsorship](/domains/sponsorship/overview.md), "On the public site"). A change made straight in the database, outside the site, needs a forced build. Queueing never blocks a payment or a change: if the pending build cannot be recorded, a line is logged and the next build of any kind picks the change up.

**Sane** is read only at build time: when an event's state changes on Sane, publish the event in Sanity or trigger a build so the button follows ([Events](/domains/events/overview.md)).

## Related concepts

- [Studio](/systems/studio.md) (the publish webhook's settings), [Netlify deploys](/systems/operations/netlify.md), [Environment variables](/systems/operations/environment.md)
- [Sponsorship](/domains/sponsorship/overview.md) (what a build reads from the database), [Events](/domains/events/overview.md) (state machine), [Content](/domains/content/overview.md), [Content model](/domains/content/content-model.md) (which types trigger a build)

# Related specs

None.
