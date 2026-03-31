# macos-cleaner

Monorepo (**Bun** + **Turbo**) for the **whirlpool** CLI: inspect disk space, find `~/Library` data tied to installed apps, plan user cache cleanup, and work with Finder Trash on **macOS** (v1 is macOS-only).

## Requirements

- [Bun](https://bun.com) 1.3+ (see root `package.json` → `packageManager`)
- macOS (the CLI calls `assertMacOS()` on startup)

## Setup

From the repository root:

```bash
bun install
```

## Install `whirlpool` on your Mac (compiled binary)

The CLI is built as a **standalone executable** with [`bun build --compile`](https://bun.com/docs/bundler/executables) (bundles the Bun runtime and workspace code into one file).

From the repository root:

```bash
bun run install-cli
```

By default this installs to **`~/.local/bin/whirlpool`**. Ensure that directory is on your `PATH` (the script prints a hint if it is not).

Custom prefix (e.g. `/opt/homebrew/bin` — may need `sudo` depending on permissions):

```bash
PREFIX=/opt/homebrew/bin bun run install-cli
```

Build only (output: `apps/cli/dist/whirlpool`):

```bash
bun run build:cli
```

## Building **Whirlpool.app** (macOS bundle)

The bundle is built by `scripts/build-macos-app.sh`: it compiles the CLI with **`bun build --compile`**, copies the binary to **`Whirlpool.app/Contents/MacOS/whirlpool`**, and writes **`Info.plist`** from `packaging/macos/Info.plist.template`. Bundle identifier: **`com.pedroaba.whirlpool`**.

### How to build (from the repository root)

1. Install dependencies (first time, or after the lockfile changes):

   ```bash
   bun install
   ```

2. Generate **Whirlpool.app**:

   ```bash
   bun run build:macos-app
   ```

   Same as:

   ```bash
   bash scripts/build-macos-app.sh
   ```

### Build output

| Artifact | Location |
| -------- | -------- |
| **Whirlpool.app** | `apps/cli/dist/Whirlpool.app` |
| Compiled CLI (also embedded in the app) | `apps/cli/dist/whirlpool` |

`CFBundleShortVersionString` / `CFBundleVersion` come from **`apps/cli/package.json`** → `"version"`.

### Optional: output path and code signing

| Variable | Effect |
| -------- | -------- |
| `APP_OUT` | Full path of the bundle (default: `apps/cli/dist/Whirlpool.app`) |
| `CODESIGN_IDENTITY` | Apple identity to sign with; if unset, the script uses **ad hoc** (`-`) for local builds |
| `build:icons` | Generates `packaging/macos/AppIcon.icns` + PNG sizes from `packaging/macos/icon.svg` |

Examples:

```bash
APP_OUT="$HOME/Desktop/Whirlpool.app" bun run build:macos-app
CODESIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)" bun run build:macos-app
```

For distribution outside your Mac, use **Developer ID** signing and Apple **notarization** (not automated here).

### Install and run

- In Finder, open **`apps/cli/dist/`** and drag **Whirlpool.app** to **Applications**.
- From Terminal:

  ```bash
  open "/Applications/Whirlpool.app" --args disk
  export PATH="/Applications/Whirlpool.app/Contents/MacOS:$PATH"
  whirlpool scan Safari
  ```

  If the app is still only in the repo: `open "$(pwd)/apps/cli/dist/Whirlpool.app" --args disk`  
  After it lives in **Applications**: `open -a Whirlpool --args disk`

Templates: **`packaging/macos/`**.

## Workspace layout

| Path             | Description                                      |
| ---------------- | ------------------------------------------------ |
| [apps/cli](apps/cli/README.md) | **whirlpool** entrypoint; `.app` via `packaging/macos/` |
| [packages/cleanup](packages/cleanup/README.md) | Cache plans, Trash helpers, `movePathsToTrashMacOS` |
| [packages/config](packages/config/README.md) | Load whirlpool TOML config |
| [packages/disk](packages/disk/README.md) | Boot volume snapshot + delta lines |
| [packages/explore](packages/explore/README.md) | Remnant / orphan scan for bundle ids |
| [packages/format](packages/format/README.md) | Human-readable byte formatting |
| [packages/fs-meta](packages/fs-meta/README.md) | Spotlight `mdls`, sizes, plist helpers |
| [packages/logging](packages/logging/README.md) | Pino + OpenTelemetry |
| [packages/platform](packages/platform/README.md) | OS guard, Full Disk Access settings URL |
| [packages/system-apps](packages/system-apps/README.md) | Resolve app name / bundle id for scans |
| [packages/taxonomy](packages/taxonomy/README.md) | Scan dirs + orphan reason ids |

## CLI quick start

The binary is declared as `whirlpool` in `apps/cli` (see `package.json` → `bin`).

```bash
bun apps/cli/src/index.ts -- --help
bun apps/cli/src/index.ts disk
bun apps/cli/src/index.ts scan "Safari"
bun apps/cli/src/index.ts cache size
bun apps/cli/src/index.ts trash list
```

Use `--` before flags like `--help` when invoking through `bun` so they are not swallowed by the runtime.

Development with reload:

```bash
cd apps/cli && bun --watch src/index.ts -- disk
```

Or from the root:

```bash
bunx turbo dev --filter=@whirlpool/cli
```

## Repo scripts

```bash
bun run build           # turbo build (per-package)
bun run build:cli       # compile CLI only → apps/cli/dist/whirlpool
bun run build:macos-app # Whirlpool.app → apps/cli/dist/Whirlpool.app
bun run install-cli     # compile + copy whirlpool to ~/.local/bin (see above)
bun run lint            # turbo lint
bun run check-types     # turbo check-types
```

## Privacy and permissions

Some operations need **Full Disk Access** (TCC) for the host app (Terminal, Cursor, iTerm, etc.): reading `~/.Trash`, emptying Trash, or similar. If the CLI reports a permission error, use the suggested System Settings link or add the host app under **Privacy & Security → Full Disk Access**, then retry.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, style, and pull request expectations.

## License

Proprietary — [LICENSE](LICENSE): **Pedro Augusto Barbosa Aparecido** (MEI, CNPJ 57.593.443/0001-50, Cachoeira de Minas/MG). All rights reserved; no use or redistribution except under written agreement with the licensor.

The repository may be private and packages may use `workspace:*`; that does not waive the terms in `LICENSE`.
