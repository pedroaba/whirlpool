# @whirlpool/platform

Minimal **platform guard** and macOS integration helpers.

## Main exports

- `assertMacOS()` — exits with a clear stderr message if not running on darwin
- `openFullDiskAccessSettings()` — opens System Settings near **Privacy & Security** so users can grant **Full Disk Access** when Trash or other paths return permission errors

No workspace dependencies.

## Scripts

`build`, `lint`, `check-types`.
