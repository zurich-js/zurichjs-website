# Knowledge updates

## 2026-11-19

- **Added**: the [Sponsorship](/domains/sponsorship/index.md) domain (self-serve sponsorships, from the old sponsorship doc, checked against the code), a [Stripe](/systems/stripe.md) concept for the shared webhook, and a Spec for [online sponsorship on /partners](/domains/sponsorship/specs/partners-page-online.md). [Partners](/domains/partners/overview.md) keeps the public side and links to it.
- **Update**: memberships, sponsorships and donations share one Stripe webhook, `/api/stripe/webhook` ([Membership payments](/domains/membership/api.md), [Donations](/domains/donations/overview.md), [Environment variables](/systems/operations/environment.md)); Netlify Functions are bundled with esbuild ([Web app](/systems/web.md), [Netlify deploys](/systems/operations/netlify.md)); the Slack bots call the model provider with an explicit base URL ([Slack content agent](/systems/slack-agent.md)).
- **Correction**: the old sponsorship doc said the sponsorship webhook is its own Stripe endpoint with its own secret; the code has one shared endpoint and secret ([Stripe](/systems/stripe.md)). The old runbook said the webhook updates Netlify Database; it is Neon.
- **Update**: the binding rules moved out of `AGENTS.md` into [Working rules](/conventions/working-rules.md) and [UI and design system rules](/systems/design-system/ui-rules.md); `AGENTS.md` now only points into this bundle.

- **Bootstrap**: the documentation became this OKF bundle. The old docs (docs/design-system.md and docs/v2) were rehomed into concepts under [Systems](/systems/index.md), [Domains](/domains/index.md) and [Reference](/reference/index.md); the dated phase records (`STATUS.md`, `PLAN.md`, `BLOCKERS.md`, `UI-AUDIT.md`, `CONTENT-MODEL-DIFF.md`) were folded in and removed. Git keeps their history.
- **Correction**: contact and partner enquiries go to email and Slack only, never to Sanity ([Forms](/domains/forms/overview.md)). The old runbook said they reach Sanity.
- **Correction**: the membership status machine also allows a board or Stripe ending straight from active or past due, and Stripe activating an imported member ([Membership](/domains/membership/overview.md)).
