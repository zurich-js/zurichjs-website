# pr-sponsor-lifecycle

Media for the sponsorship lifecycle PR (branch `t3/sponsorship-lifecycle`, head `d6129a7`, stacked on `t3/sponsorship-audit-fixes`).

**Mocked:** the built sample site (`CONTENT_SOURCE=sample`, `BUILD_NOW=2026-11-01T12:00:00+01:00`) on port 4542. `/api/sponsorship/*` (signed in as a test contact) and `/api/membership/admin/*` are answered by the real route handlers on the in-memory sponsor store, with Stripe, Resend and Slack faked at `fetch`. The refund and dispute come through the real shared webhook handler with signed test events. No real Stripe, database, email or Slack was used.

Widths: 390 and 1440 (visual review), 375 and 1280 (UI rules). Full-page captures use reduced motion. The sticky header over the content is a full-page capture artefact.

| File | State |
| --- | --- |
| `01-sponsor-again-signs-in-full-*` | An ended sponsorship with an old agreement and contract: sponsoring again asks for a full signature |
| `02-terminated-needs-the-board-*` | A sponsorship ZurichJS terminated: the sponsor's restart is refused and they are asked to write to ZurichJS; nothing changes |
| `03-upgrade-form-*` | Upgrading now while a yearly switch is scheduled for the renewal |
| `04-upgrade-drops-scheduled-change-*` | The success notice says the scheduled change no longer applies |
| `05-admin-history-refund-dispute-*` | A refund and a dispute in the board's history, with amounts; the sponsorship is still active |
| `terminated-restart-1440.mp4`, `.gif` | Recording (motion on): sponsoring again after a termination is refused |

## Independent review fixes (24th November 2026)

For #107 (`t3/sponsorship-lifecycle`, fix `83618129`). Captured on the combined top of the stack, `t3/sponsorship-account` at `747f5dcf` (it contains the #105 and #107 fixes), built with `CONTENT_SOURCE=sample BUILD_NOW=2026-11-01T12:00:00+01:00` and served on port 4542.

**Mocked, and labelled MOCK at the bottom of every capture:** every `/api/membership/admin/*` and `/api/sponsorship/*` request is answered by the real route handlers on the in-memory sponsor store, with Stripe, Resend and Slack faked at `fetch` (`apps/web/test/sponsor-faults.ts`). Stripe failures and the lost answer are injected on purpose (`failNext`, `loseNext`). The daily check runs in the harness, not on a schedule. No real Stripe, database, email or Slack was used.

Widths: 320, 375, 390, 1280 and 1440. Full-page captures use reduced motion; the sticky header in the middle of a page is a full-page capture artefact.

| File | State |
| --- | --- |
| `06-end-stripe-failed-confirmation-held-*` | End outright while Stripe fails twice: an error for the board; the first daily check sends neither "Stripe stopped" nor "Nothing more is charged" |
| `07-end-finished-by-daily-check-*` | The next daily check cancels the subscription, then sends both once |
| `08-history-partial-dispute-*` | History of a CHF 100 dispute on a CHF 840 card payment: both amounts |
| `end-held-until-stripe-stops-1440.mp4`, `.gif` | Recording (motion on): the end fails at Stripe; the confirmation waits |

Measured at 1440: first daily check notices {"sent": 0, "failed": 0, "waiting": 2, "unrecorded": 0}, "Stripe stopped" notes before Stripe closed: 0; second check {"stripeClosed": 1, "notices": {"sent": 2, "failed": 0, "waiting": 0, "unrecorded": 0}}, notes after: 1. Dispute row: `{"charge": "ch_2", "amount": 84000, "dispute": "dp_partial", "disputed": 10000, "reason": "duplicate"}`.

SHA-256:

| File | SHA-256 |
| --- | --- |
| `06-end-stripe-failed-confirmation-held-320.png` | `edf69ce921694be86d0d1450a9429c225e884cf6c9608614d837a32f40fdb6d7` |
| `06-end-stripe-failed-confirmation-held-375.png` | `2fdb1584f068904b7bddd6d47c2ca23145508b015cb95aa7d5bc2d95c2506de8` |
| `06-end-stripe-failed-confirmation-held-390.png` | `f2eb66e8624f80e6a9283178f35f06617bc6cecb5e7b85a92f0407bcfa6d5607` |
| `06-end-stripe-failed-confirmation-held-1280.png` | `5d8f370d8181b48c57f99b5f5932bc8f877e171873e444f6c92f4b29faed641f` |
| `06-end-stripe-failed-confirmation-held-1440.png` | `0d7105f2cb6fce91278ed6900d49095d7f87d7d5b475696977b521a0864fe4b5` |
| `07-end-finished-by-daily-check-320.png` | `7f87f8d0312cb6d2495b0ea373c6eade0ecebd1820bad7405eec5020178da20a` |
| `07-end-finished-by-daily-check-375.png` | `5323161c7f70a13381f43e8759a257029804bf2ab06519188d80361aaee2e008` |
| `07-end-finished-by-daily-check-390.png` | `27ac0884a3f7e19277a0a418176e4418a9495b3d66d2be973c751769fc316e3c` |
| `07-end-finished-by-daily-check-1280.png` | `cebc51276fffbdc73bee7eac2a9d701de04a57a872580e6d998ff92b2014a7e4` |
| `07-end-finished-by-daily-check-1440.png` | `e60c608787b47f4a823aed5e6cd4a5cf695379dd74e69d598b2147319f3fd373` |
| `08-history-partial-dispute-320.png` | `11a77003438b73fb24f53d2725e7a1c5822dba7a143c6ab08cfd12d53ba15f40` |
| `08-history-partial-dispute-375.png` | `1c06b29ed5cd0ec0d6957718dd94843602b71b7f8900dd865ba9e9e3892b9d17` |
| `08-history-partial-dispute-390.png` | `f9ffd1360a791f9a885b7d29064c736839ff276a78ce11e58dc09fe83d0b9cc9` |
| `08-history-partial-dispute-1280.png` | `2131a4e4553443913c89387b39cbbf49ba3d9b82b52bf34a777da210af087702` |
| `08-history-partial-dispute-1440.png` | `b37cfa5bd4d0344721d9c6194a4ac4d643eb6775c7c8d2882b05fc92862ddb14` |
| `end-held-until-stripe-stops-1440.mp4` | `00ecaa277e23f1e5904ea96d9b18a23cec7bccd79b78bb42e9a9013517c5e92a` |
| `end-held-until-stripe-stops-1440.gif` | `1cfcbbb01648bf9f5195d234340fed4e1f4ad52c409a10850941e19ca3e0df08` |
