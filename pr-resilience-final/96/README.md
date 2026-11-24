# An uncertain bank transfer

The board sees the uncertain result, reloads the record, and submits the original date and amount. The mock replays the 502 and 200 bodies observed in the real local PostgreSQL payment probe.

The screenshots use the built ZurichJS pages, their normal header and mocked API responses. Every image is full page with reduced motion. The clips have motion enabled. All captures reported Figtree, zero horizontal overflow and zero page errors.

| State                   | 320 px                                 | 375 px                                 | 390 px                                 | 1280 px                                  | 1440 px                                  |
| ----------------------- | -------------------------------------- | -------------------------------------- | -------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| payment outcome unknown | [320](payment-outcome-unknown-320.png) | [375](payment-outcome-unknown-375.png) | [390](payment-outcome-unknown-390.png) | [1280](payment-outcome-unknown-1280.png) | [1440](payment-outcome-unknown-1440.png) |
| same payment recovered  | [320](same-payment-recovered-320.png)  | [375](same-payment-recovered-375.png)  | [390](same-payment-recovered-390.png)  | [1280](same-payment-recovered-1280.png)  | [1440](same-payment-recovered-1440.png)  |

## Recordings

- payment reload and retry [MP4](payment-reload-and-retry.mp4) · [GIF](payment-reload-and-retry.gif)

## Verification

- [96-before-27b6919.log](96-before-27b6919.log)
- [96-final-probes.log](96-final-probes.log)
- [96-before-browser.log](96-before-browser.log)
- [96-105-checks.log](96-105-checks.log)
