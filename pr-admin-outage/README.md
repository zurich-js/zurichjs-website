# pr-admin-outage

The built site (sample content, fixed clock 2026-11-01) on localhost, reduced motion. **Every /api answer is a mocked fixture** (Playwright `page.route`): no real service. List fixtures come from the real list handlers on in-memory stores (501 sponsorships, 520 members, all invented).

States, each at 320, 375, 390, 1280 and 1440 px (`pr-admin-outage-<state>-<width>.png`):

| State | What it shows |
| --- | --- |
| session-unreachable, session-502 | the session check fails: "We couldn’t reach the admin area." and Try again, not the sign-in form |
| signed-out | the sign-in form; keyboard focus on the password field (3 px focus ring) |
| signin-502 | a platform 502 on sign-in: "We couldn’t complete sign-in. Try again in a moment." |
| signin-refused | no connection on sign-in |
| sponsors-loading, members-loading | the loading line (role="status") |
| sponsors-slow | after 10 s: "This is taking longer than usual." |
| sponsors-failed, members-failed | a failed list: announced error and Try again (keyboard focus shown on sponsors) |
| sponsors-502 | a platform 502 on the list |
| sponsors-empty | no sponsorships |
| sponsors-truncated, members-truncated | "Showing the newest 500 of 501 sponsorships." / "… of 520 members.", counts over every row |

`checks.json`: per state and width, horizontal overflow (none), page errors (none), focus outline, live regions and loaded fonts (Figtree).

Recording, motion on, 1280 px: outage → Try again → sign-in 502 → sign in → list fails → Try again → list with the truncation note: [mp4](pr-admin-outage-flow.mp4), [gif](pr-admin-outage-flow.gif).

![flow](https://raw.githubusercontent.com/zurich-js/zurichjs-website/v2/pr-media/pr-admin-outage/pr-admin-outage-flow.gif)
