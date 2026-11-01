# Sanity Clean Content Studio

Congratulations, you have now installed the Sanity Content Studio, an open-source real-time content editing environment connected to the Sanity backend.

Now you can do the following things:

- [Read “getting started” in the docs](https://www.sanity.io/docs/introduction/getting-started?utm_source=readme)
- [Join the community Slack](https://slack.sanity.io/?utm_source=readme)
- [Extend and build plugins](https://www.sanity.io/docs/content-studio/extending?utm_source=readme)

## V2 (zurichjs-website `platform/`)

Additive schema for the V2 site; existing documents keep working.

- **Events:** status, end time, month text for TBC events, structured venue, hosts, agenda, "Good to know", photos and recap. `isProMeetup`, `stripePriceId` and `ticketSaleUrl` are deprecated (pro meetups and paid tickets are gone): read-only, hidden when empty, values kept.
- **Event workspace:** Events › Upcoming / Needs attention / Past. Every event has a **Readiness** tab and badge listing what the public page still needs. "New document › Meetup (from template)" pre-fills the usual practical info.
- **Singletons:** Meetup rating (manual, no scraping; empty score hides it), Conference module, Site settings.
- **Talk proposals:** review stages Received → Under review → Accepted → Scheduled → Given (stored values unchanged), plus "Convert to Talk".
- **Declared** what the site already writes: speaker company/location/topics, `comprehensiveFeedback`, status `under_review`.
- **Presentation tool:** previews the V2 site at `SANITY_STUDIO_PREVIEW_URL` (default `http://localhost:4321`). Point it at the draft preview site (built with `SANITY_PERSPECTIVE=drafts`) to see unpublished changes.
- **Site settings › Support page:** the Twint QR code (and an optional line under it) shown on `/donate` for one-off contributions. Empty means the page shows only the email address.
- **Typed queries:** after changing the schema or a query in the website's `platform/packages/content/src/queries.ts`, run `npm run typegen` with both repos checked out side by side and commit `sanity.types.ts` in the website.

```bash
npm install
npm run dev
npx sanity build --no-auto-updates             # offline-safe build
npm run schema                                  # schema.json without API access
npm run typegen                                 # schema + types into ../zurichjs-website/platform/packages/content/src/sanity.types.ts (sibling checkout)
npx sanity migration run v2-additive            # dry run; add --dataset v2-preview --no-dry-run to apply
SANITY_WRITE_TOKEN=… npx sanity exec scripts/seed-v2-preview.ts --with-user-token   # sample content into v2-preview
```

Publishing triggers a site rebuild through a webhook: see [WEBHOOKS.md](./WEBHOOKS.md). Deploying the Studio (`sanity deploy`), creating the `v2-preview` dataset and running migrations on `production` are owner actions.
