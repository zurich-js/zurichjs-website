# Decision record

The decision record of zurichjs.com: what was decided, why, and by whom, in date order. Concepts state what is true now; these pages keep how it got there. Binding rules keep their attribution in the concept that owns them.

- [Building the platform](/reference/decisions/platform-build.md): 31st October to 1st November 2026, scope, phases A to 5, CI, the switchover
- [Launch restoration](/reference/decisions/launch-restoration.md): 1st and 2nd November 2026, the audit against the old production site
- [Studio, membership and design system](/reference/decisions/studio-membership-design.md): 3rd to 25th November 2026

## How this record is kept

- New decisions are added at the end of the latest page, as `## <what> (<who>, <date>)` with one bullet per decision.
- An entry that a later decision replaces is either annotated "(Replaced on <date>: …)" or, when a newer entry explicitly replaces all of it, trimmed to a one-line note naming its replacement. Git keeps the original text.

Trimmed when the docs became this bundle (2026-11-19), each because a newer entry explicitly replaced it:

- "Tokens live in TypeScript; the CSS is generated" (Phase 2), by "Tokens in CSS, no generator"
- the donation removal and the payment-free `/donate` (No payments), by "Launch restoration after the V2 audit"
- "Maps load only on request", by "Venue maps are always shown"
- "Deploys stay manual" (the Studio), by "The Studio deploys on merge"
- the Supabase design, Slack approvals, signed declarations, and membership phases 2 and 3, by "Membership on Netlify only, anyone can join, certificates"

Added: "Estimated schedules (owner, 4th November 2026)", which was recorded only in `AGENTS.md` and `packages/events/src/schedule.ts`.
