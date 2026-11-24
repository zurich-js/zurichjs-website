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
