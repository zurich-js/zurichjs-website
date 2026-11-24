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

## Independent review fixes (24th November 2026)

For #109 (`t3/sponsorship-account`, fix `747f5dcf`). Captured on the combined top of the stack, `t3/sponsorship-account` at `747f5dcf` (it contains the #105 and #107 fixes), built with `CONTENT_SOURCE=sample BUILD_NOW=2026-11-01T12:00:00+01:00` and served on port 4542.

**Mocked, and labelled MOCK at the bottom of every capture:** every `/api/membership/admin/*` and `/api/sponsorship/*` request is answered by the real route handlers on the in-memory sponsor store, with Stripe, Resend and Slack faked at `fetch` (`apps/web/test/sponsor-faults.ts`). Stripe failures and the lost answer are injected on purpose (`failNext`, `loseNext`). The daily check runs in the harness, not on a schedule. No real Stripe, database, email or Slack was used.

Widths: 320, 375, 390, 1280 and 1440. Full-page captures use reduced motion; the sticky header in the middle of a page is a full-page capture artefact.

| File | State |
| --- | --- |
| `07-admin-pending-primary-does-not-count-*` | The board cannot remove the confirmed primary contact while the only other primary has not accepted |
| `08-colleague-cannot-remove-confirmed-primary-*` | A colleague (Ada) is refused the same on the sponsorship page |
| `confirmed-primary-kept-1440.mp4`, `.gif` | Recording (motion on): the board's removal is refused |

Contacts at 1440: Grace Hopper (primary, confirmed), Pending Primary (primary, not accepted), Ada Colleague (other, confirmed).

SHA-256:

| File | SHA-256 |
| --- | --- |
| `07-admin-pending-primary-does-not-count-320.png` | `60ae3e9e73db4826c37425512f1b33567f6abe87b3965f606748ccc7cd16588b` |
| `07-admin-pending-primary-does-not-count-375.png` | `88bd28cb851b156592ef7258a7835059c7a9ab039964377aa613627813941fe4` |
| `07-admin-pending-primary-does-not-count-390.png` | `389a273c7a2786fcb6654b624d40f70c628b3c478158c393bb7ab3d748efcd2f` |
| `07-admin-pending-primary-does-not-count-1280.png` | `a47bcbeedbd19a9ec6e7c89bab34fd5521c40a1354f0a25556e6b8483f268c96` |
| `07-admin-pending-primary-does-not-count-1440.png` | `6b29361529da821c1fca97816b1c13550db3ceb18a08f099b255a7065aa87bda` |
| `08-colleague-cannot-remove-confirmed-primary-320.png` | `91477e3b54e4d808adbec86c55c6c9a25dff636b85b5bb11a4f5119818375413` |
| `08-colleague-cannot-remove-confirmed-primary-375.png` | `8bfad3d0884fb39290995b7006ef66ded6bb0506ddcb0da9b6a5c83235eeb5f3` |
| `08-colleague-cannot-remove-confirmed-primary-390.png` | `9301e60fd276ebdd320fcff5c7b27474a74edce167900c29f2dc5aa878d2f736` |
| `08-colleague-cannot-remove-confirmed-primary-1280.png` | `e5bea7656b7fa7cfc28d69f9b804517f6a325581b2327e55931596e0069111de` |
| `08-colleague-cannot-remove-confirmed-primary-1440.png` | `1e3ff632b8825449fcd18c2f26b027945ee16c73f4ea0ff1a081342e30d5a0ec` |
| `confirmed-primary-kept-1440.mp4` | `3604d2f20dcb9fbe66952293f8d6b6a63a116a63bfe4e693677090a1b588fcaf` |
| `confirmed-primary-kept-1440.gif` | `982548db39fbf29d694118ebb5df21e3df7649988ebcc9f913a63ef00c602a03` |
