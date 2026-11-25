# pr-sponsor-recovery

Media for the sponsorship recovery PR (branch `t3/sponsorship-audit-fixes`, head `bfda159`).

**Mocked:** the built sample site (`CONTENT_SOURCE=sample`, `BUILD_NOW=2026-11-01T12:00:00+01:00`) on port 4542. Every `/api/membership/admin/*` request is answered by the real route handlers, running on the in-memory sponsor store, with Stripe, Resend and Slack faked at `fetch`. Stripe failures are injected on purpose (`failNext`). No real Stripe, database, email or Slack was used.

Widths: 390 and 1440 (visual review), 375 and 1280 (UI rules). Full-page captures use reduced motion. The sticky header overlapping the page heading is a full-page capture artefact.

| File                                | State                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `01-list-*`                         | Sponsor list (normal)                                                                             |
| `02-invite-one-time-form-*`         | Inviting a one-time bundle of two meetups, with the email on (the form default)                   |
| `03-invite-one-time-sent-*`         | It saves and emails (the B1-00 crash is gone)                                                     |
| `04-details-saved-stripe-warning-*` | Details saved while Stripe fails: a note, not an error                                            |
| `05-end-stripe-failed-*`            | End outright while Stripe fails to cancel the subscription: an error, the subscription id is kept |
| `06-end-retry-finished-*`           | The same click again cancels the subscription and confirms                                        |
| `07-payment-link-meetup-over-*`     | A payment link refused for a bundle whose meetup is over                                          |
| `end-retry-1440.mp4`, `.gif`        | Recording (motion on): Stripe fails, the retry finishes the end                                   |

## Independent review fixes (24th November 2026)

For #105 (`t3/sponsorship-audit-fixes`, fix `513df437`). Captured on the combined top of the stack, `t3/sponsorship-account` at `747f5dcf` (it contains the #105 and #107 fixes), built with `CONTENT_SOURCE=sample BUILD_NOW=2026-11-01T12:00:00+01:00` and served on port 4542.

**Mocked, and labelled MOCK at the bottom of every capture:** every `/api/membership/admin/*` and `/api/sponsorship/*` request is answered by the real route handlers on the in-memory sponsor store, with Stripe, Resend and Slack faked at `fetch` (`apps/web/test/sponsor-faults.ts`). Stripe failures and the lost answer are injected on purpose (`failNext`, `loseNext`). The daily check runs in the harness, not on a schedule. No real Stripe, database, email or Slack was used.

Widths: 320, 375, 390, 1280 and 1440. Full-page captures use reduced motion; the sticky header in the middle of a page is a full-page capture artefact.

| File                                        | State                                                                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `08-payment-link-answer-lost-*`             | Stripe made the payment link but its answer was lost: the board sees an error, and the attempt (request and idempotency key) is on record |
| `09-payment-link-retry-one-link-*`          | The same click again asks Stripe with the same key, switches the lost link off and keeps one new link                                     |
| `payment-link-lost-answer-1440.mp4`, `.gif` | Recording (motion on): the answer is lost, the retry creates one link                                                                     |

Measured at 1440: active links after the lost answer ['plink_2'], after the retry ['plink_4'] (saved: `plink_4`), unsettled attempts 0.

SHA-256:

| File                                      | SHA-256                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `08-payment-link-answer-lost-320.png`     | `1a2a162e33426d2eab70d411eacc21070e67824fe29e826df266069dbd6d5afc` |
| `08-payment-link-answer-lost-375.png`     | `9e6138618cff7ea14c5cb6d7a5dca216b56bd5dcc04ec271c0e98cd9ddd496df` |
| `08-payment-link-answer-lost-390.png`     | `28d69203f5d0997d0ca66a55dbba048beb67d2e031ca3beb5edbf4ec442ff65f` |
| `08-payment-link-answer-lost-1280.png`    | `78e1bd56692725f46a457396ff8467739b3c949fd95e7cda437d3e8aa9604145` |
| `08-payment-link-answer-lost-1440.png`    | `7df21d17bbf8b815e27751e00123638c44dc1f0bf751ccc385627d5226476351` |
| `09-payment-link-retry-one-link-320.png`  | `6e63b6c3bd87bfe64dd05d70c07ac5cf27eb20d7ad1fcc84b5f8c46a9ddcb0ac` |
| `09-payment-link-retry-one-link-375.png`  | `83b4b18fd09eaf7dc4a4d8a896cf6bdd9c3afc21ebf5e4ea18397ea5ca9e8760` |
| `09-payment-link-retry-one-link-390.png`  | `64f05f3447ef9d4d1c4a4fd610b2c0f1127e25d8c208dc25f9bceac705e0cb04` |
| `09-payment-link-retry-one-link-1280.png` | `fc3c3b434742879629ed8b8591257a98ccdbb02f49e237384fe3cb4cfafef391` |
| `09-payment-link-retry-one-link-1440.png` | `eca66ce5caba6dd2aeab34a80777bc5f730d3f6987f261f1604eae9053f825e3` |
| `payment-link-lost-answer-1440.mp4`       | `496bb42ddebc629612ee50fae5c50afb7f9ce89469754553f33bb10b98f7864d` |
| `payment-link-lost-answer-1440.gif`       | `2a4bd64d0dbd40ee457d3d5766740b3eaf5cc8feb04230146515c12b1942f825` |

The independent-review recording carries a visible MOCK label throughout the MP4 and GIF.
