# @whirlpool/taxonomy

Shared **taxonomy** for orphan / remnant scanning: which `~/Library` subdirectories to walk, how bundle ids are recognized, and **reason codes** explaining why a path was flagged (`OrphanReasonId`, `OrphanReason`).

## Main exports

- `LIBRARY_SCAN_SUBDIRS` — directory names under `~/Library` used by scanners
- `looksLikeBundleIdOrReverseDns` — heuristic for bundle-like strings
- `OrphanReason` / `OrphanReasonId` — enum-style reason ids for candidates

No workspace dependencies. Kept small so `explore`, `system-apps`, and the CLI can share one vocabulary.

## Scripts

`build`, `lint`, `check-types`.
