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
- **Presentation tool:** previews the V2 site at `SANITY_STUDIO_PREVIEW_URL` (default `http://localhost:4321`).

```bash
npm install
npm run dev
npx sanity build --no-auto-updates             # offline-safe build
npx tsx scripts/extract-schema.ts               # schema.json without API access
npx sanity typegen generate                     # types for ../zurichjs-website/platform/packages/content (sibling checkout)
npx sanity migration run v2-additive            # dry run; add --dataset v2-preview --no-dry-run to apply
SANITY_WRITE_TOKEN=… npx sanity exec scripts/seed-v2-preview.ts --with-user-token   # sample content into v2-preview
```

Publishing triggers a site rebuild through a webhook: see [WEBHOOKS.md](./WEBHOOKS.md). Deploying the Studio (`sanity deploy`), creating the `v2-preview` dataset and running migrations on `production` are owner actions.
