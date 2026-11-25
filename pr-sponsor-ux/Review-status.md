# Independent review follow-up

The review pinned source `53051d6656862d72120038c15cb11534a35a7002`, whose application tree was published unchanged before one test-comment deletion.

A definite card decline can leave a fee-bearing upgrade quote claimed. Reusing `sponsor-plan:<quoteId>` then replays the cached decline, and the board cannot replace the claimed quote. The parent independently reproduced the retry returning 502 instead of 200 using a provider fixture that caches error results by key. Current plan and fee remain intact.

Fee-bearing immediate upgrades remain on hold. A correction is in progress; this gallery is not evidence that declined retries recover. The original successful-retry fixture lacked error replay and its conclusion is superseded. This defect is separate from the policy discussion about dunning, accepting requests during outages and the default upgrade timing.

The review also noted a success notice showing the base fee rather than the total, a raffle meetup-load failure without an inline retry, and daily cleanup exhausting its budget before later work. Those findings are assigned for investigation/correction.
