# deepmerge (vendored)

`deepmerge@4.3.1` from npm with one change in `dist/cjs.js`: own `__proto__` keys are skipped when building the merged object, which fixes GHSA-gcqx-w48m-w2h4 (prototype poisoning of returned objects). No patched release exists on npm (4.3.1 is the latest).

Used only through `@netlify/config` (Netlify build and dev tooling), via the `deepmerge` override in `platform/pnpm-workspace.yaml`. Remove this folder and the override once a fixed `deepmerge` is published.
