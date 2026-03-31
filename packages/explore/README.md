# @whirlpool/explore

**Library remnant discovery**: scans configurable subfolders of `~/Library` for paths that look tied to given **bundle ids** (leftover caches, support folders, plists, etc.). Supports progress callbacks for phase changes and candidate ticks (used by the CLI spinner).

## Main exports

- `scanRemnantsForBundleIds` — targeted scan for installed-app bundle id set
- `scanOrphans` — broader orphan scan (package API; CLI uses targeted flow)
- `OrphanCandidate`, `ScanOrphansCallbacks` — types for paths, sizes, reasons

## Dependencies

- `@whirlpool/fs-meta` — sizes and metadata
- `@whirlpool/system-apps` — installed-app context where relevant
- `@whirlpool/taxonomy` — scan directories and orphan reason ids

## Scripts

`build`, `lint`, `check-types`.
