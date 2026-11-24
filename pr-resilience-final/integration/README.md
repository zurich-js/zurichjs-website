# Resilience integration verification

The tested merge is `91fd1035723304650a25f4b53f38bdb5f2ad81f0`. It combines #96 at `54b098de` with #99 at `004e3775`, which includes #97 at `00d0f3fa` and #95 at `ef604266`. Its sponsorship dependencies are #105 at `513df437` and #107 at `d7d5cdd6`. #109 is a separate change. Further lifecycle corrections need a fresh integration run.

The merge keeps the callback-scoped fetch, agreement coverage, scheduled-change uncertainty, named replacement notices, daily admission checks, deferred cleanup and reminder delivery. The 520-row fixture and real PostgreSQL query-count tests both run in this tree. The local bundle contains only the integration commits. Fetch the PR heads first. [Tested merge bundle](integrated-proof.bundle)

```sh
git bundle verify integrated-proof.bundle
git fetch ./integrated-proof.bundle refs/heads/w/resilience-proof-20261124
git show --stat FETCH_HEAD
```

## Results

- All 735 repository tests passed with local PostgreSQL. Lint, UI lint, formatting, knip and typecheck passed. The deterministic sample build and all 46 affected browser tests passed. [Build and browser results](combined-build-browser.log)
- The nine separate probes reused the real handlers and local database for payments and donation claims. The first paid-through update took 11 seconds against a 10-second client timeout. A later read saw the new date, a pending sponsorship and zero completed payment events. Both retry sequences finished with one completed event. [Probe results](combined-final-probes.log) · [Delayed retry](payment-delayed.json) · [Immediate retry](payment-immediate.json)
- Mocked Blobs and Stripe responses exercised conditional-write exhaustion, merged-state pruning, overlapping ticks, ended sponsors with outstanding payment handles and an overdue reminder. The real PostgreSQL donation test checked both fenced operations. [Probe results](combined-final-probes.log)
- The [board payment](../96/README.md), [admin](../97/README.md) and [account](../99/README.md) galleries contain 45 full-page screenshots and four recordings. The captures use mocked browser responses. [Media verification](media-verification.json)

## Reproduction

From a disposable checkout of the tested merge, install the workspace dependencies and put PostgreSQL 17's `initdb` and `pg_ctl` on PATH. Copy the three `.test.ts.txt` files to `tmp/battle-test/resilience-final-corrections/probes/`, dropping the final `.txt`. Copy `vitest.config.ts.txt` to its parent directory as `vitest.config.ts`. The probes start disposable Unix-socket-only databases and use fixture integrations.

```sh
evidence=tmp/battle-test/resilience-final-corrections
mkdir -p "$evidence/logs"
ln -s ../../../apps/web/node_modules "$evidence/node_modules"
LC_ALL=C pnpm exec vitest run --config "$evidence/vitest.config.ts" --reporter=verbose --silent=false
```
