# Sponsor review evidence

The worker captured the sponsor account and board on the tested UX tree. Every screenshot, recording, provider response and email acknowledgement uses local mocks. The worker's suite results and the two known mobile visual failures are documented in the [report](Report.md). The [gallery](Gallery.md) links to each state and recording.

| Layer | Worker source | Signed application commit | Git tree |
| --- | --- | --- | --- |
| Integration | `80fcc16f47e5f0444f54a79be152c0042a32159c` | `18a1cac4c056729c279c9485b2b59802b5af7b23` | `5306a8efd1d20319d8b4505783df388b7a15c455` |
| UX captured here | `53051d6656862d72120038c15cb11534a35a7002` | `96cdcf63def306b0ee9e417d5694f6b34b2d243f` | `ae224226bcded6d6992ba0e9e0a8e09021c67cf9` |
| Published UX | Signed UX plus removal of one test comment | `90bf57b25b0444a34ece763bbf4a83d2c7ad6576` | `40c62aacfb90562ead5dbeb0fbc63e85bbf13bc1` |

The original media commit was `dde1b391c14c49f547212cb6a19653fc5c6ede2e`. All 416 files under its `pr-sponsor-ux` directory were copied byte for byte. This publication adds this mapping alongside them. The [manifest](manifest.json) gives SHA-256 hashes for the full-page screenshots and both recording formats.

The publication check covered all 16 tests in the sponsorship-flow file, staged formatting and linting, and the repository typecheck. The full-suite results belong to the original worker. Release remains on hold pending fresh independent review.
