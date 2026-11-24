# pr-sponsor-account

Media for the sponsorship account and board PR (branch `t3/sponsorship-account`, head `c51027e`, stacked on `t3/sponsorship-lifecycle`).

**Mocked:** the built sample site (`CONTENT_SOURCE=sample`, `BUILD_NOW=2026-11-01T12:00:00+01:00`) on port 4542. `/api/sponsorship/*` (signed in as a test contact) and `/api/membership/admin/*` are answered by the real route handlers on the in-memory sponsor store, with Stripe, Resend and Slack faked at `fetch`. No real Stripe, database, email or Slack was used. The public one-time listing (S2-07) needs database rows that sample builds never read; it is covered by `packages/content/test/sponsorships.test.ts`.

Widths: 390 and 1440 (visual review), 375 and 1280 (UI rules); no layout changed, so no 320. Captures use reduced motion. The sticky header over the content is a full-page capture artefact.

| File | State |
| --- | --- |
| `01-logo-received-and-zurich-dates-*` | Logo uploaded: "An organiser adds it to zurichjs.com"; a signature at 23:30 UTC shows the Zurich day (19th) |
| `02-colleague-remove-focus-*` | Removing a colleague by keyboard: focus moves to the question (checked in the script) |
| `03-change-link-no-longer-applies-*` | `?change=end` on a sponsorship that is already ending: a note instead of silence |
| `04-admin-contacts-running-*` | Running sponsorship: "Email sign-in link"; a colleague who has not accepted gets no button; the last primary cannot be removed |
| `05-admin-started-online-not-paid-*` | A company that started online and left Checkout: "Started online, not paid" |
| `06-checkout-slow-way-back-*` | Stripe slow after Checkout: "Back to your sponsorship" and "Check again", with a contact line |
| `checkout-way-back-1440.mp4`, `.gif` | Recording (motion on): the slow wait, then back to the sponsorship |
