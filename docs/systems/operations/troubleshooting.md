---
type: Reference
title: Troubleshooting
description: What each known build, CI and runtime failure means and what to do about it.
tags: [operations, troubleshooting]
timestamp: '2026-11-24T00:00:00Z'
---

# Troubleshooting

A failed Netlify build never replaces the live deploy, so the previous version stays up while you fix forward.

- **"Sanity is not reachable" on a production build:** deliberate. Production never ships sample content. Check Sanity's status and the token, then retry.
- **"SANITY_PERSPECTIVE=drafts needs SANITY_READ_TOKEN":** the draft preview site is missing its Viewer token.
- **"[media] IMAGEKIT_PRIVATE_KEY missing" or "ImageKit could not be read" failing a production build:** deliberate, so `/media` never ships empty. Check the key in Netlify (build scope) and ImageKit's status, then retry. To check the archive locally without the key, see [Local development](/systems/local-development.md).
- **"[sane] … could not be read":** the event links to Meetup in this build instead of Sane. Never fails the build. Check that the event is published on Sane and that the slugs in "Free tickets on Sane" match its link, then publish in Sanity (or trigger a build) to try again.
- **A content change broke the build:** the previous deploy stays live. Fix or revert the document in Sanity's history.
- **A production build fails without `DATABASE_URL`:** deliberate; the membership migrations run before every build ([Membership](/domains/membership/overview.md)).
- **CI, the SEO parity gate:** a URL, title, canonical URL, JSON-LD type or sitemap entry was lost. Fix it, or record an intended change, with a reason, in `tools/seo/scope.json` or `tools/seo/allowlist.json` ([SEO](/systems/seo.md)). Never weaken the gate to get green.
- **CI, visual regression:** the log's "Visual diff summary" step shows where each screenshot differs, and the `reports` artifact has the images. If the change is intended, run `pnpm exec playwright test e2e/visual.spec.ts --update-snapshots`, commit the new baselines and say why in the PR ([Testing](/systems/testing.md)).
- **`astro check` fails with an `@emnapi` error after a dependency update:** keep the `@emnapi/runtime` override in `pnpm-workspace.yaml` on 1.x ([CI](/systems/operations/ci.md)).
- **CI, `pnpm audit`:** nothing is ignored ([CI](/systems/operations/ci.md)). A finding needs a fix or a same-major override.
- **`/donate` says "Online payments are not available right now" on localhost:** the expected fallback without `STRIPE_SECRET_KEY` ([Local development](/systems/local-development.md)).
- **The membership webhook gets slow:** Netlify stops synchronous functions after 60 seconds, and `invoice.paid` does the most work. Watch its duration in the function logs ([Stripe](/systems/stripe.md)).
- **Pages answer "Try again" after about 5 or 10 seconds:** the database did not answer. A connection gives up after 5 s and a query after 10 s (`DB_TIMEOUTS` in `apps/web/src/server/db-url.ts`), and the route answers its own 502. Check Neon's status ([Netlify deploys](/systems/operations/netlify.md), "Function time limits").
- **A sponsorship request fails after about 50 seconds:** Stripe, Resend or Slack were slow, and the request's 50 s budget for outbound calls ran out (`apps/web/src/server/deadline.ts`) before Netlify's 60 s limit.
- **"[sponsorship-daily] time budget reached":** the daily check stopped before its 25 s budget ran out, inside Netlify's 30 s limit for scheduled functions, and names the sponsorships it did not check. They are looked at again on the next run ([Sponsorship](/domains/sponsorship/overview.md)).
- **"[sponsorship-daily] ended, but the Stripe payment page may still be payable":** the budget stopped the Stripe close of the named sponsorships. Their ids are kept: switch the Checkout session or payment link off in Stripe ([Sponsorship](/domains/sponsorship/overview.md)).
- **A Netlify Function fails with `ERR_MODULE_NOT_FOUND`:** it was deployed unbundled. The build must run `node scripts/bundle-functions.mjs` and use `.netlify/functions-bundled` ([Web app](/systems/web.md)).
- **The Slack bots answer "Sorry, something went wrong (Unauthorized)":** the model client lost its explicit base URL and went to Netlify's AI Gateway ([Slack content agent](/systems/slack-agent.md)).
- **The Slack bots do nothing:** without their variables the functions answer Slack with 401 and do nothing. Check the variables in [Environment variables](/systems/operations/environment.md), and that Netlify Background Functions are on the site's plan.

## Related concepts

- [Operations](/systems/operations/index.md), [Netlify deploys](/systems/operations/netlify.md), [CI](/systems/operations/ci.md)

# Related specs

None.
