# Whirlpool

Recover disk space on **macOS** with **low-risk cleanup** workflows: inspect disk usage, find app remnants under `~/Library`, manage caches, and work with Finder Trash.

- **Safer by design**: read-only scans first; destructive steps ask for confirmation.
- **Honest output**: shows sizes and paths; heuristics can miss or mislabel—review before you clean.
- **Practical focus**: today the CLI ships **cache inspection and cleanup**; more workflows can grow from here.

> **v0.1** is **macOS-only** and implemented in **Python** (requires **Python 3.14+**).

## Why it’s safer than typical “cleaners”

Whirlpool is built around **visibility and user intent**:

- **`cache plan` is read-only**: scans and reports what would be targeted—nothing is deleted.
- **`cache clear` is explicit**: shows a confirmation (unless you pass `--yes`) before removing paths.
- **Review the table**: cache folders are shared across apps; only remove what you understand.

## What it can do today

| Command | What it does |
|--------|----------------|
| `whirlpool cache plan` | Summarize cache size and list paths that **`cache clear` would remove** (no writes). |
| `whirlpool cache clear` | Re-scan, confirm (or `-y`), then **delete** those cache paths. **Irreversible.** |

Common options (both commands):

- `--no-browsers` — skip known browser cache locations.
- `--ignore PATH` — exclude paths (repeatable).

Run `whirlpool cache` or `whirlpool --help` for full help.

## Requirements

- **macOS**
- **[uv](https://docs.astral.sh/uv/)** (recommended) and **Python 3.14+**

## Install and run

Clone the repo, then from the project root:

```bash
uv sync
```

Optional dev tools (Black, isort, Flake8, pytest, taskipy):

```bash
uv sync --extra dev
```

Run the CLI (console script):

```bash
uv run whirlpool --help
uv run whirlpool cache plan
```

Or activate the virtualenv and call `whirlpool` directly:

```bash
source .venv/bin/activate   # or your shell’s equivalent
whirlpool cache plan
```

You can also run the package module:

```bash
uv run python -m whirlpool
```

## Development tasks (taskipy)

With `--extra dev` installed:

| Task | Command |
|------|---------|
| CLI (same as `uv run whirlpool`) | `uv run --extra dev task run` |
| Tests | `uv run --extra dev task test` |
| Format (Black + isort) | `uv run --extra dev task format` |
| Lint (Flake8) | `uv run --extra dev task lint` |

## Privacy & permissions

- **Local-first**: runs on your machine; no telemetry is configured in this repo by default.
- **Full Disk Access**: if macOS blocks reads under `~/Library/Caches` or similar, you may need **Full Disk Access** for the host app (Terminal, Cursor, iTerm, etc.) under **System Settings → Privacy & Security → Full Disk Access**.

## FAQ

### Can this break my Mac?

Use **`cache plan`** first. **`cache clear`** removes directories/files under the planned paths—recovery is not through Finder Trash for that flow. Prefer small, understood targets and `--ignore` for paths you want to keep.

### Does `cache clear` move things to Trash?

**No.** It deletes the planned cache paths after confirmation (or with `--yes`). Use **`cache plan`** to see exactly what would be affected.

### Does it work on Windows or Linux?

Not in v1. The project targets **macOS** (paths and conventions assume macOS).

## Developers / contributors

- **[`CONTRIBUTING.md`](CONTRIBUTING.md)** — how to contribute
- **[`LICENSE`](LICENSE)** — proprietary license; all rights reserved unless agreed in writing with the licensor

## License

Proprietary — see [`LICENSE`](LICENSE).
