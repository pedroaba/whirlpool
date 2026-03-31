# @whirlpool/cleanup

macOS-oriented **cleanup operations**: plan and execute user cache deletions from config, **Trash** helpers (list entries, move paths to Trash via AppleScript, empty Trash via Finder), and typed errors when Trash is not readable (e.g. TCC / Full Disk Access).

## Main exports

- **Cache** — `planCacheClean`, `executeCacheClean`, `browserExtraCachePaths`, `CacheCleanPlan`
- **Trash** — `listTrashEntries`, `trashTotalBytes`, `movePathsToTrashMacOS`, `emptyTrashMacOS`, `TrashAccessError`, `TrashEntry`, `trashDir`, `purgeTrashFolderContents`

## Dependencies

- `@whirlpool/config` — cache path patterns and options
- `@whirlpool/fs-meta` — sizing / metadata where needed

## Scripts

`build`, `lint`, `check-types` (see `package.json`).
