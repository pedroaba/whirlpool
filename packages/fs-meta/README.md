# @whirlpool/fs-meta

Filesystem and **metadata** utilities: recursive byte size, Spotlight **`mdls`** parsing, lightweight plist string reads, and heuristics to infer an “app” label from metadata (useful for Trash listings and orphan grouping).

## Main exports

- `getPathByteSize` — aggregate size under a path
- `readMdls` / `readStatMeta` — Spotlight and `lstat`-like fields
- `inferLikelyApp` — display guess from metadata + basename
- `readPlistStringField` — small plist helper
- Types: `SpotlightMeta`, `FileStatMeta`

No workspace dependencies; uses Node/Bun `fs` and macOS CLI (`mdls`) where applicable.

## Scripts

`build`, `lint`, `check-types`.
