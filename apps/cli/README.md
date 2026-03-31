# whirlpool CLI

The **whirlpool** command-line tool (`@whirlpool/cli`) helps you inspect disk usage, find `~/Library` remnants tied to **installed** macOS apps, clean user caches from config, and list or empty **Finder Trash**. It targets **macOS only** (other platforms exit on startup).

Stack: [cac](https://github.com/cacjs/cac) for argv, [@clack/prompts](https://github.com/bombshell-dev/clack) for confirm/multiselect, [picocolors](https://github.com/alexeyraspopov/picocolors) for ANSI output, and a worker-thread spinner so long file-system scans stay responsive.

---

## Requirements

- **macOS** (darwin)
- **Bun** (same major version as the repo root `packageManager` field)

---

## Install on your PATH (standalone binary)

From the **repository root**, build with [`bun build --compile`](https://bun.com/docs/bundler/executables) and install to **`~/.local/bin/whirlpool`** (override with `PREFIX`):

```bash
bun run install-cli
```

After adding `~/.local/bin` to `PATH`, run `whirlpool --help` (no `bun` prefix).

### Whirlpool.app (bundle id `com.pedroaba.whirlpool`)

Produces **`Whirlpool.app`** under `apps/cli/dist/` for drag-to-**Applications** installs:

```bash
# from repo root
bun run build:macos-app
```

Icon assets are generated from `packaging/macos/icon.svg` (see root script `bun run build:icons`).

See root [README](../../README.md) for `open … --args` and PATH hints.

## Run from source (Bun runtime)

There is no global npm publish in v1; you can execute the entrypoint with Bun:

```bash
# repository root
bun install
bun apps/cli/src/index.ts -- --help
```

Always pass **`--`** before flags like `--help` when using `bun …/index.ts`, so Bun does not consume them.

```bash
bun apps/cli/src/index.ts disk
bun apps/cli/src/index.ts scan "Visual Studio Code"
bun apps/cli/src/index.ts orphans-clean Spotify --dry-run
bun apps/cli/src/index.ts cache size
bun apps/cli/src/index.ts trash list
```

From `apps/cli`:

```bash
cd apps/cli
bun src/index.ts -- disk
bun --watch src/index.ts -- disk   # reload on file changes
```

`package.json` also declares `"bin": { "whirlpool": "./src/index.ts" }` for `bun install` / linking workflows; the recommended local install is `bun run install-cli` at the monorepo root.

---

## Command reference

Global help:

```bash
bun apps/cli/src/index.ts -- --help
```

Per-command help (recommended for exact flags and examples):

```bash
bun apps/cli/src/index.ts scan --help
bun apps/cli/src/index.ts orphans-clean --help
bun apps/cli/src/index.ts trash --help
bun apps/cli/src/index.ts cache --help
bun apps/cli/src/index.ts disk --help
```

### `disk`

Prints boot volume **used / total / % / available** (statfs on `/`). No options.

### `scan <target>`

**Read-only** scan: resolves `<target>` to an **installed** app (display name or bundle id), then lists remnant paths under `~/Library` (Caches, Application Support, Preferences, LaunchAgents, etc.) with sizes.

| Option | Description |
| ------ | ----------- |
| `--json` | Single JSON object: matched app, disk snapshot, `candidates`, summary counts/bytes |
| `--dry-run` | No-op on disk (scan never writes; useful for shared argv with other commands) |

Examples: `scan Safari`, `scan com.microsoft.VSCode`, `scan "Visual Studio Code" --json`.

### `orphans-clean <target>`

Same discovery as `scan`, then an interactive **multiselect** (sorted by size), final **confirm**, and move selected paths to **Trash** (Finder-equivalent; recoverable until Trash is emptied).

| Option | Description |
| ------ | ----------- |
| `--dry-run` | After you choose items, print what would be moved and skip the actual move |

### `cache size` | `cache measure`

Measures byte totals for cache paths defined in your **whirlpool config** (TOML), with live progress on stderr when sizing directories.

| Option | Description |
| ------ | ----------- |
| `--browsers` | Include extra Chrome/Edge cache dirs under Application Support (broader scope) |

### `cache clean`

Deletes the same planned cache paths (after optional confirmation), or simulates deletion.

| Option | Description |
| ------ | ----------- |
| `--dry-run` | Report removable bytes without deleting |
| `--browsers` | Same extra browser paths as `cache size` |
| `-y`, `--yes` | Skip the interactive confirm step |

### `trash list`

Lists items in **`~/.Trash`** with sizes, paths, inferred app hints, and metadata when available. May require **Full Disk Access** for the host app (Terminal, Cursor, etc.) if macOS denies reading Trash.

### `trash clear`

Empties Trash via **Finder** (permanent delete of trashed items). Not the same as moving files *into* Trash.

| Option | Description |
| ------ | ----------- |
| `-y`, `--yes` | Skip the empty-Trash confirmation |

---

## Environment

| Variable | Effect |
| -------- | ------ |
| `NO_COLOR` | Disables ANSI colors (when supported by picocolors) |
| `LOG_LEVEL` | Pino log level on **stderr** (e.g. `info`, `debug`) |
| `OTEL_*` / `WHIRLPOOL_OTEL_ENABLED` | Optional OpenTelemetry export (see `@whirlpool/logging` README) |

Structured logs go to **stderr**; normal CLI tables and summaries go to **stdout** (except scan/cache progress spinners, which use **stderr**).

---

## Permissions (Trash / Full Disk Access)

If `trash list` or `trash clear` fails with a permission error, macOS **TCC** is blocking access to `~/.Trash`. Grant **Full Disk Access** to the application that launches Bun (e.g. **Terminal**, **Cursor**, **iTerm**), then rerun. The CLI may open **System Settings → Privacy & Security** for you when it detects this case.

---

## Development

| Script | Command |
| ------ | ------- |
| Watch | `bun --watch src/index.ts -- <args>` |
| Package `dev` | `bun run dev` (same watch entry) |
| Types | `bun run check-types` |
| Lint | `bun run lint` |
| Build | `bun run build` → `dist/whirlpool` (compiled executable) |
| Bundle only | `bun run build:bundle` → JS in `dist/` (no embedded runtime) |

From repo root: `bunx turbo dev --filter=@whirlpool/cli`.

---

## Workspace packages

The CLI depends on: `@whirlpool/cleanup`, `config`, `disk`, `explore`, `format`, `fs-meta`, `logging`, `platform`, `system-apps`, `taxonomy`. See the root [README](../../README.md) for links to each package’s README.

---

## Source layout (high level)

| Path | Role |
| ---- | ---- |
| `src/index.ts` | Entrypoint: `assertMacOS`, logger, `createCli`, `parse` |
| `src/cli.ts` | Command definitions, `--help` text, `cac` setup |
| `src/commands/*.ts` | Per-command runners |
| `src/utils/` | argv normalization, scan spinner/progress, colored `out*` helpers |
