# #96 review fixes: server evidence

Server-only change: no page changes, so no screenshots. Every external service in these tests is a mock (Stripe, Slack, Netlify Blobs) or a throwaway local Postgres (`donation-events-db.test.ts`).

- [`regression-tests-on-old-head-8219eba.log`](regression-tests-on-old-head-8219eba.log): the new tests against the PR's previous source. 17 fail.
- [`regression-tests-on-fix-27b6919.log`](regression-tests-on-fix-27b6919.log): the same 38 tests on the fix. All pass.

| Review finding | Test that failed before and passes now |
| --- | --- |
| 1 Withdrawal clears payable refs | `does not end an unpaid sponsorship when its meetup read left too little time…`, `keeps the Stripe ids and reports the sponsor when the budget cuts off its close` |
| 2 Unfinished donation claim answered 200 | `a claim abandoned before posting is not answered as done…`, `posts one note; a delivery while another is posting is answered 409`, both DB claim tests |
| 3 Stale Blobs read drops a rebuild | `reads strongly, so a cache with an older ETag cannot use up the writes` |
| 4 Older sponsor deferred every day | `ends what is due from the row alone before reading the meetups…`, `starts the unpaid ones at a different sponsor each day…` |
| 5 Callbacks bypass the deadline | `make no Stripe call once the request budget is used up` |
| 6 Settle discards concurrent state | `the one that finishes last takes back no fired time and no build time`, `the one recorded after the decision stays pending` |
| 7 Unsent stub recorded as posted | `records nothing when Slack is not configured…`, `answers 200 when the note went out but marking it posted failed…` |
| 8 Request signal dropped | `keeps the abort signal of a Request passed without init` |

Full checks on 27b6919: lint, lint:ui, format:check, knip, typecheck, 61 files and 662 tests passed.
