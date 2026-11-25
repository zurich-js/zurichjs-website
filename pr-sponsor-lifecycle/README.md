# pr-sponsor-lifecycle

Media for the sponsorship lifecycle PR (branch `t3/sponsorship-lifecycle`, head `d6129a7`, stacked on `t3/sponsorship-audit-fixes`).

**Mocked:** the built sample site (`CONTENT_SOURCE=sample`, `BUILD_NOW=2026-11-01T12:00:00+01:00`) on port 4542. `/api/sponsorship/*` (signed in as a test contact) and `/api/membership/admin/*` are answered by the real route handlers on the in-memory sponsor store, with Stripe, Resend and Slack faked at `fetch`. The refund and dispute come through the real shared webhook handler with signed test events. No real Stripe, database, email or Slack was used.

Widths: 390 and 1440 (visual review), 375 and 1280 (UI rules). Full-page captures use reduced motion. The sticky header over the content is a full-page capture artefact.

| File                                  | State                                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `01-sponsor-again-signs-in-full-*`    | An ended sponsorship with an old agreement and contract: sponsoring again asks for a full signature                          |
| `02-terminated-needs-the-board-*`     | A sponsorship ZurichJS terminated: the sponsor's restart is refused and they are asked to write to ZurichJS; nothing changes |
| `03-upgrade-form-*`                   | Upgrading now while a yearly switch is scheduled for the renewal                                                             |
| `04-upgrade-drops-scheduled-change-*` | The success notice says the scheduled change no longer applies                                                               |
| `05-admin-history-refund-dispute-*`   | A refund and a dispute in the board's history, with amounts; the sponsorship is still active                                 |
| `terminated-restart-1440.mp4`, `.gif` | Recording (motion on): sponsoring again after a termination is refused                                                       |

## Independent review fixes (24th November 2026)

For #107 (`t3/sponsorship-lifecycle`, fix `83618129`). Captured on the combined top of the stack, `t3/sponsorship-account` at `747f5dcf` (it contains the #105 and #107 fixes), built with `CONTENT_SOURCE=sample BUILD_NOW=2026-11-01T12:00:00+01:00` and served on port 4542.

**Mocked, and labelled MOCK at the bottom of every capture:** every `/api/membership/admin/*` and `/api/sponsorship/*` request is answered by the real route handlers on the in-memory sponsor store, with Stripe, Resend and Slack faked at `fetch` (`apps/web/test/sponsor-faults.ts`). Stripe failures and the lost answer are injected on purpose (`failNext`, `loseNext`). The daily check runs in the harness, not on a schedule. No real Stripe, database, email or Slack was used.

Widths: 320, 375, 390, 1280 and 1440. Full-page captures use reduced motion; the sticky header in the middle of a page is a full-page capture artefact.

| File                                           | State                                                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `06-end-stripe-failed-confirmation-held-*`     | End outright while Stripe fails twice: an error for the board; the first daily check sends neither "Stripe stopped" nor "Nothing more is charged" |
| `07-end-finished-by-daily-check-*`             | The next daily check cancels the subscription, then sends both once                                                                               |
| `08-history-partial-dispute-*`                 | History of a CHF 100 dispute on a CHF 840 card payment: both amounts                                                                              |
| `end-held-until-stripe-stops-1440.mp4`, `.gif` | Recording (motion on): the end fails at Stripe; the confirmation waits                                                                            |

Measured at 1440: first daily check notices {"sent": 0, "failed": 0, "waiting": 2, "unrecorded": 0}, "Stripe stopped" notes before Stripe closed: 0; second check {"stripeClosed": 1, "notices": {"sent": 2, "failed": 0, "waiting": 0, "unrecorded": 0}}, notes after: 1. Dispute row: `{"charge": "ch_2", "amount": 84000, "dispute": "dp_partial", "disputed": 10000, "reason": "duplicate"}`.

SHA-256:

| File                                              | SHA-256                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `06-end-stripe-failed-confirmation-held-320.png`  | `edf69ce921694be86d0d1450a9429c225e884cf6c9608614d837a32f40fdb6d7` |
| `06-end-stripe-failed-confirmation-held-375.png`  | `2fdb1584f068904b7bddd6d47c2ca23145508b015cb95aa7d5bc2d95c2506de8` |
| `06-end-stripe-failed-confirmation-held-390.png`  | `f2eb66e8624f80e6a9283178f35f06617bc6cecb5e7b85a92f0407bcfa6d5607` |
| `06-end-stripe-failed-confirmation-held-1280.png` | `5d8f370d8181b48c57f99b5f5932bc8f877e171873e444f6c92f4b29faed641f` |
| `06-end-stripe-failed-confirmation-held-1440.png` | `0d7105f2cb6fce91278ed6900d49095d7f87d7d5b475696977b521a0864fe4b5` |
| `07-end-finished-by-daily-check-320.png`          | `7f87f8d0312cb6d2495b0ea373c6eade0ecebd1820bad7405eec5020178da20a` |
| `07-end-finished-by-daily-check-375.png`          | `5323161c7f70a13381f43e8759a257029804bf2ab06519188d80361aaee2e008` |
| `07-end-finished-by-daily-check-390.png`          | `27ac0884a3f7e19277a0a418176e4418a9495b3d66d2be973c751769fc316e3c` |
| `07-end-finished-by-daily-check-1280.png`         | `cebc51276fffbdc73bee7eac2a9d701de04a57a872580e6d998ff92b2014a7e4` |
| `07-end-finished-by-daily-check-1440.png`         | `e60c608787b47f4a823aed5e6cd4a5cf695379dd74e69d598b2147319f3fd373` |
| `08-history-partial-dispute-320.png`              | `11a77003438b73fb24f53d2725e7a1c5822dba7a143c6ab08cfd12d53ba15f40` |
| `08-history-partial-dispute-375.png`              | `1c06b29ed5cd0ec0d6957718dd94843602b71b7f8900dd865ba9e9e3892b9d17` |
| `08-history-partial-dispute-390.png`              | `f9ffd1360a791f9a885b7d29064c736839ff276a78ce11e58dc09fe83d0b9cc9` |
| `08-history-partial-dispute-1280.png`             | `2131a4e4553443913c89387b39cbbf49ba3d9b82b52bf34a777da210af087702` |
| `08-history-partial-dispute-1440.png`             | `b37cfa5bd4d0344721d9c6194a4ac4d643eb6775c7c8d2882b05fc92862ddb14` |
| `end-held-until-stripe-stops-1440.mp4`            | `6ef17b4dbdd4c3184f4027771c5d8e4e198f33aa3bc1f7e66c2788b6e8dc5b64` |
| `end-held-until-stripe-stops-1440.gif`            | `75c94fa814c07b1406135ff264782508e136299e0c97ca626bdf3d5dd7d1d130` |

## Retrying a recorded transfer

The board submits the same CHF 30 transfer after its first acknowledgement is lost. The retry confirms the original paid-through date. The local store contains one payment event. The fake email and Slack services each received one message. Captured at 320, 375, 390, 1280 and 1440 pixels. The browser loaded Figtree and reported zero horizontal overflow or page errors at all five widths.

![Retrying a recorded transfer](transfer-already-recorded-1440.gif)

| File                                    | SHA-256                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `transfer-already-recorded-1440.mp4`    | `87dbf727cde3e32ac7c569b726d2b69b99e96f437a387a8b9f9bf3d164760e8a` |
| `transfer-already-recorded-1440.gif`    | `652de3f6a299942384fbc534348788401cd2f9c85eba0fcbbef5ec04079ea674` |
| `09-transfer-answer-lost-1280.png`      | `6828cf9a8698c6aaf35bc9ab1573f385f820385cee1e3e8969901537a1bce66e` |
| `09-transfer-answer-lost-1440.png`      | `840fd64fdc84a01c2be04deaac645964fc3b178116e1005271ef1a771a0ff371` |
| `09-transfer-answer-lost-320.png`       | `369f30c5ebfe93c967e9066f873bd9e213dcfc30b32e56b98edd6c1e0bdb1042` |
| `09-transfer-answer-lost-375.png`       | `8d695910aab72f623da1fa7078e8657c2fd8b28c3c426b6e5d7077952e9a77e7` |
| `09-transfer-answer-lost-390.png`       | `ec0b2afb52c1062ffa23658fa336f6cf8e4823db6b98a08f7a8cd7fcd414aa03` |
| `10-transfer-already-recorded-1280.png` | `dd8d4e1db4ec98a9855a82cfd72b352d8d6e26a164ffb4fe5453fcb9c410ead4` |
| `10-transfer-already-recorded-1440.png` | `d020d95627c68a4bd84bbc74a30a98ed577e8140cdd6394527fd6754f873a8e3` |
| `10-transfer-already-recorded-320.png`  | `338af210eb3f84dcfb890456206c881339e59fa8d3819985602a7797ee98cb02` |
| `10-transfer-already-recorded-375.png`  | `42662b83fc82c0c7fe6a2dfc57a638b2408f92acf3a7ce6ede770c640ef18cf1` |
| `10-transfer-already-recorded-390.png`  | `ddfd9e8a65ac0c66f70bb5218ac1db31293d7ae2f4c617c598835e965f44da35` |

The independent-review recordings carry a visible MOCK label throughout the MP4 and GIF.
