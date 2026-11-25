# Membership correction evidence for #101

All views and recordings use local fixtures and simulated payment, email and Slack responses. No production transactions are shown.

- Tested source: `b4aa2b58f81adf42add74938e3d65d0260821915`.
- First published application: `c58bcd22706e9854aa6176c279ac2cac86b6f9cd`.
- Original signed media source: `4ba698964d3d6c5b55c35ede11150aebee3cdb62`.
- Worker verification: 680 repository tests and 28 selected membership browser checks passed. Lint, UI lint, format, Knip, typecheck, deterministic sample build and SEO parity passed.
- Screenshots cover 320, 375, 390, 1280 and 1440 px. Recordings are provided as MP4 and GIF with MOCK labels.
- Earlier full browser runs reported known About and Partners mobile visual differences. Independent final review is pending.

The published application tree is identical to the tested source tree; only signed ancestry changed.

## Captures

- [manual-form-1280.png](manual-form-1280.png)
- [manual-form-1440.png](manual-form-1440.png)
- [manual-form-320.png](manual-form-320.png)
- [manual-form-375.png](manual-form-375.png)
- [manual-form-390.png](manual-form-390.png)
- [manual-payment-1280.gif](manual-payment-1280.gif)
- [manual-payment-1280.mp4](manual-payment-1280.mp4)
- [manual-payment-390.gif](manual-payment-390.gif)
- [manual-payment-390.mp4](manual-payment-390.mp4)
- [manual-result-1280.png](manual-result-1280.png)
- [manual-result-1440.png](manual-result-1440.png)
- [manual-result-320.png](manual-result-320.png)
- [manual-result-375.png](manual-result-375.png)
- [manual-result-390.png](manual-result-390.png)

[SHA-256 manifest](manifest.json)

## Current-main integration

The follow-up application `325ae7299398a12e2a9592d6ab1574d0ee8b3ef2` integrates main `7a0ad93809b7aa025d0860f566fee34cf08cdf27`. Its full repository suite passed 797 tests with disposable PostgreSQL. The top of the stack passed 32 selected browser checks and ten additional mocked flow replays. Merge commits ran signing, formatting, lint and repository typecheck hooks.
