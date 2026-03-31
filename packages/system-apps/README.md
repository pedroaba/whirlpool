# @whirlpool/system-apps

**Installed application catalog** for macOS: discover apps under `/Applications` (and related locations), index them by display name and bundle id, and **resolve** a user-typed `scan`/`orphans-clean` target to a concrete app record and bundle id set.

## Main exports

- `resolveScanTarget(raw: string)` — match by name or bundle id
- `getInstalledAppCatalog` / `getInstalledAppIndex` — listing and index
- `isBundleStillInstalled` — quick check
- Types: `InstalledAppRecord`, `InstalledAppIndex`

## Dependencies

- `@whirlpool/taxonomy` — shared conventions where needed

## Scripts

`build`, `lint`, `check-types`.
