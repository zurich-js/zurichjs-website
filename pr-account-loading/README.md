# pr-account-loading

The built site (sample content, fixed clock 2026-11-01) on localhost, reduced motion. **Every /api answer is a mocked fixture** (Playwright `page.route`); the signed-in sponsor is the e2e fixture "Acme AG" (invented). No real service.

States, each at 320, 375, 390, 1280 and 1440 px (`pr-account-loading-<state>-<width>.png`):

| State | What it shows |
| --- | --- |
| sponsor-loading, member-loading | the shared loading line (role="status") |
| sponsor-slow, member-slow | after 10 s: "This is taking longer than usual." (clock fast-forwarded) |
| sponsor-failed, member-failed | no connection: the error, with Try again (keyboard focus shown on the sponsor page) |
| sponsor-signed-out, member-signed-out | unchanged sign-in, keyboard focus on the email field |
| sponsor-plan-unknown | Stripe could not be asked for a scheduled change: "We couldn’t check for a change waiting for your renewal." and no Keep button |

`checks.json`: overflow (none), page errors (none), focus outline (3 px), live regions.

`lighthouse-main/summary.json`: P5-08 rechecked on **origin/main 8ccc85b**, mobile Lighthouse 12.6.1 (the audit's method, signed-out API mock), 3 runs per page: CLS 0.000 and performance 99 on both account pages, so no reserved-space change was made.

Recording, motion on, 1280 px: slow → no connection → Try again → signed in with the unknown change: [mp4](pr-account-loading-flow.mp4), [gif](pr-account-loading-flow.gif).

![flow](https://raw.githubusercontent.com/zurich-js/zurichjs-website/v2/pr-media/pr-account-loading/pr-account-loading-flow.gif)
