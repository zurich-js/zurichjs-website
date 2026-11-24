# pr-sponsor-recovery

Media for the sponsorship recovery PR (branch `t3/sponsorship-audit-fixes`, head `bfda159`).

**Mocked:** the built sample site (`CONTENT_SOURCE=sample`, `BUILD_NOW=2026-11-01T12:00:00+01:00`) on port 4542. Every `/api/membership/admin/*` request is answered by the real route handlers, running on the in-memory sponsor store, with Stripe, Resend and Slack faked at `fetch`. Stripe failures are injected on purpose (`failNext`). No real Stripe, database, email or Slack was used.

Widths: 390 and 1440 (visual review), 375 and 1280 (UI rules). Full-page captures use reduced motion. The sticky header overlapping the page heading is a full-page capture artefact.

| File | State |
| --- | --- |
| `01-list-*` | Sponsor list (normal) |
| `02-invite-one-time-form-*` | Inviting a one-time bundle of two meetups, with the email on (the form default) |
| `03-invite-one-time-sent-*` | It saves and emails (the B1-00 crash is gone) |
| `04-details-saved-stripe-warning-*` | Details saved while Stripe fails: a note, not an error |
| `05-end-stripe-failed-*` | End outright while Stripe fails to cancel the subscription: an error, the subscription id is kept |
| `06-end-retry-finished-*` | The same click again cancels the subscription and confirms |
| `07-payment-link-meetup-over-*` | A payment link refused for a bundle whose meetup is over |
| `end-retry-1440.mp4`, `.gif` | Recording (motion on): Stripe fails, the retry finishes the end |
