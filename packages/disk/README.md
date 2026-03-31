# @whirlpool/disk

Small **disk space** helpers for the boot volume (default `/`): snapshot via `statfs`, human-readable one-line summaries, and before/after **delta** lines for CLI output.

## Main exports

- `getDiskSnapshot` — `{ mountPoint, totalBytes, availBytes, usedBytes }`
- `formatDiskSnapshotLine` / `formatDeltaLine` — strings for terminals
- `printDiskBanner` — optional `writeLine` injection (CLI often uses its own colored printers)

## Dependencies

- `@whirlpool/format` — `formatBytes`

## Scripts

`build`, `lint`, `check-types`.
