# Checking a scheduled sponsorship change

Both the ordinary renewal form and the linked immediate upgrade wait for a readable renewal. The upgrade confirmation names the plan and date that it replaces.

The screenshots use the built ZurichJS pages, their normal header and mocked API responses. Every image is full page with reduced motion. The clips have motion enabled. All captures reported Figtree, zero horizontal overflow and zero page errors.

| State                            | 320 px                                          | 375 px                                          | 390 px                                          | 1280 px                                           | 1440 px                                           |
| -------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ------------------------------------------------- | ------------------------------------------------- |
| plan form after check again      | [320](plan-form-after-check-again-320.png)      | [375](plan-form-after-check-again-375.png)      | [390](plan-form-after-check-again-390.png)      | [1280](plan-form-after-check-again-1280.png)      | [1440](plan-form-after-check-again-1440.png)      |
| plan form unknown schedule       | [320](plan-form-unknown-schedule-320.png)       | [375](plan-form-unknown-schedule-375.png)       | [390](plan-form-unknown-schedule-390.png)       | [1280](plan-form-unknown-schedule-1280.png)       | [1440](plan-form-unknown-schedule-1440.png)       |
| upgrade replacement confirmation | [320](upgrade-replacement-confirmation-320.png) | [375](upgrade-replacement-confirmation-375.png) | [390](upgrade-replacement-confirmation-390.png) | [1280](upgrade-replacement-confirmation-1280.png) | [1440](upgrade-replacement-confirmation-1440.png) |
| upgrade unknown                  | [320](upgrade-unknown-320.png)                  | [375](upgrade-unknown-375.png)                  | [390](upgrade-unknown-390.png)                  | [1280](upgrade-unknown-1280.png)                  | [1440](upgrade-unknown-1440.png)                  |

## Recordings

- upgrade check and review [MP4](upgrade-check-and-review.mp4) · [GIF](upgrade-check-and-review.gif)

## Verification

- [99-before-route.log](99-before-route.log)
- [99-before-browser.log](99-before-browser.log)
- [99-after-route.log](99-after-route.log)
- [99-after-browser.log](99-after-browser.log)
- [99-final-checks.log](99-final-checks.log)
- [99-seo.log](99-seo.log)
- [97-visual-base.log](97-visual-base.log)

The full run passed 390 tests and skipped eight. The two mobile snapshot mismatches, About and Partners, produced identical PNGs on the head and its immediate base.
