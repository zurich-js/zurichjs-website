# pr-money-server-resilience: evidence

No page changes in this PR, so there are no screenshots. These are the audit's own failure probes
(slice 5, `p5-failure-modes.ts`), run on origin/main (8ccc85b) and on the branch, with mocked Stripe,
Resend and Slack and no real service. The branch run wires the daily check as
`sponsorship-daily.mts` now does, and its slow stub ends a wait when the caller aborts, as real fetch does.

| Scenario | main | branch |
| --- | --- | --- |
| Database accepts TCP, never answers (`/api/membership/admin/sponsors`) | no answer at the 70 s cap | 502 "Could not load the sponsors…" at 5.0 s |
| Sponsorship start, each Stripe call 14.5 s, Resend 9.5 s | 200 at 67.5 s (Netlify kills at 60 s) | 502 "We couldn't start the sponsorship…" at 50.0 s |
| Daily check, 3 overdue sponsors, Stripe and Slack hang | 69.0 s, ran past the 30 s limit | 23.0 s; 1 ended with its Slack note, 2 deferred |

`w4-probes-after.log`: the slice 4 donation and rebuild probes on the branch, the rebuild ones moved
to the new `update` interface. W4-16 still fails there because the probe has no database; the claim
lives in Postgres and is tested on real migrations in `apps/web/test/donation-events-db.test.ts`.
