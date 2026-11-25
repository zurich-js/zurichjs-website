# Membership correction evidence for #100

All views and recordings use local fixtures and simulated payment, email and Slack responses. No production transactions are shown.

- Tested source: `e849affac293d98a81f9164ae4d13191a271924e`.
- First published application: `1a95f36431670c91b2703cadece926f37ad98b45`.
- Original signed media source: `4ba698964d3d6c5b55c35ede11150aebee3cdb62`.
- Worker verification: 658 repository tests and 28 selected membership browser checks passed. Lint, UI lint, format, Knip, typecheck, deterministic sample build and SEO parity passed.
- Screenshots cover 320, 375, 390, 1280 and 1440 px. Recordings are provided as MP4 and GIF with MOCK labels.
- Earlier full browser runs reported known About and Partners mobile visual differences. Independent final review is pending.

The published application tree is identical to the tested source tree; only signed ancestry changed.

## Captures

- [lapse-1280.gif](lapse-1280.gif)
- [lapse-1280.mp4](lapse-1280.mp4)
- [lapse-1280.png](lapse-1280.png)
- [lapse-1440.png](lapse-1440.png)
- [lapse-320.png](lapse-320.png)
- [lapse-375.png](lapse-375.png)
- [lapse-390.gif](lapse-390.gif)
- [lapse-390.mp4](lapse-390.mp4)
- [lapse-390.png](lapse-390.png)

[SHA-256 manifest](manifest.json)

## Current-main integration

The follow-up application `038276f30648ab7990404b957e1b0fe27eadfc45` integrates main `7a0ad93809b7aa025d0860f566fee34cf08cdf27`. Its full repository suite passed 775 tests with disposable PostgreSQL. The top of the stack passed 32 selected browser checks and ten additional mocked flow replays. Merge commits ran signing, formatting, lint and repository typecheck hooks.

## Request-budget main integration

Application `2f896f03c3bc5c84cd339c54251209c8bb154252` incorporates main `4d88284041cc13763f15c0021941f23707daeec9` after #96 landed. Its full repository suite passed 824 tests, including disposable PostgreSQL. The built stack passed 32 selected browser checks and ten mocked flow replays. All merge commits ran signing and commit hooks. Independent review remains open.
