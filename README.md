# Whirlpool

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.14+-blue.svg)](https://www.python.org/downloads/)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://www.apple.com/macos/)
[![uv](https://img.shields.io/badge/build-uv-665CCC.svg)](https://docs.astral.sh/uv/)
[![Version](https://img.shields.io/badge/version-0.1.0-informational.svg)](https://github.com/pedroaba/whirlpool)

A **macOS** command-line tool for **disk cleanup** workflows with a **review-first** mindset: inspect caches, manage applications under `~/Library`, and avoid blind deletes.

Instead of silently removing files like many closed-source cleaners, Whirlpool focuses on **visibility**: what was found, where it lives, and how much space may be reclaimed **before** anything is removed.

**Current release:** `v0.1.0` · **Platform:** macOS only · **Python:** 3.14+

---

## Why Whirlpool?

Caches, temporary files, and leftovers accumulate over time on macOS. Many cleaner apps are opaque or paid. Whirlpool aims to be a **transparent**, developer-friendly alternative: understand space usage, then act deliberately.

The name **Whirlpool** comes from the **Whirlpool Galaxy**—the tool scans, groups, and helps remove scattered cache data in a controlled way.

---

## Key principles

- **Inspect before deleting** — use `cache plan` (read-only) before `cache clear`.
- **Explicit destructive actions** — cleanup asks for confirmation unless you pass `--yes`.
- **Transparent output** — paths and sizes are shown so you can review first.
- **Local-first** — runs on your machine; no telemetry is configured in this repository by default.
- **Low-risk workflow** — built around review and confirmation, not automatic deletion.

---

## Commands

### `whirlpool cache`

| Command | Description |
| ------- | ----------- |
| `whirlpool cache plan` | Scan cache locations and show what **`cache clear` would remove**. Does not delete anything. |
| `whirlpool cache clear` | Re-scan, prompt for confirmation (unless `--yes`), then **delete** the planned cache paths. **Irreversible.** |

Common options for **both** `plan` and `clear`:

| Option | Description |
| ------ | ----------- |
| `--no-browsers` | Exclude known browser cache directories. |
| `--ignore PATH` | Exclude paths matching this prefix (repeatable). |
| `-r` / `--show-report` | Show the report after the command (default: on). |

Options specific to **`cache clear`**:

| Option | Description |
| ------ | ----------- |
| `--yes` / `-y` | Skip the confirmation prompt. |
| `--verbose` / `-v` | Show the same plan report as `cache plan` before confirming. |

Examples:

```bash
whirlpool cache plan --no-browsers
whirlpool cache plan --ignore ~/Library/Caches/some-app
whirlpool cache clear --verbose
```

### `whirlpool apps`

| Command | Description |
| ------- | ----------- |
| `whirlpool apps list` | List installed applications and disk usage (sortable). |
| `whirlpool apps remove` | Interactive Textual UI: pick an app, review a removal plan, confirm, then delete planned paths. **Highly destructive.** |

Options for **`apps list`**:

| Option | Description |
| ------ | ----------- |
| `--progress` / `--no-progress` (`-p` / `-np`) | Toggle progress output during listing. |
| `--with-system-files` / `--without-system-files` (`-sf` / `-nsf`) | Include or exclude apps under system directories. |
| `--ordered-by` (`-o`) | Sort by `name` or `size` (default: `name`). |
| `--ordered-dir` (`-d`) | Sort direction: `asc` or `desc` (default: `asc`). |

### Global

| Option | Description |
| ------ | ----------- |
| `--version` / `-V` | Print the Whirlpool version and exit. |

Run `whirlpool --help` or `whirlpool cache --help` / `whirlpool apps --help` for full CLI help.

---

## Installation

### Requirements

- macOS
- Python **3.14+**
- **[uv](https://docs.astral.sh/uv/)** (recommended)

Clone and install:

```bash
git clone https://github.com/pedroaba/whirlpool.git
cd whirlpool
uv sync
```

Optional development dependencies (Black, isort, Flake8, pytest, taskipy):

```bash
uv sync --extra dev
```

Run the CLI:

```bash
uv run whirlpool --help
uv run whirlpool cache plan
```

Or activate the virtual environment:

```bash
source .venv/bin/activate
whirlpool cache plan
```

Or run as a module:

```bash
uv run python -m whirlpool
```

---

## Development

With dev extras installed, **taskipy** shortcuts:

| Task | Command |
| ---- | ------- |
| Run CLI | `uv run --extra dev task run` |
| Tests | `uv run --extra dev task test` |
| Format (Black + isort) | `uv run --extra dev task format` |
| Lint (Flake8) | `uv run --extra dev task lint` |

---

## Safety notes

Cache and app removal are **destructive**. Always run **`cache plan`** (or review the plan in **`cache clear --verbose`**) before deleting anything.

- **`cache plan`** does not delete files.
- **`cache clear`** deletes the planned paths after confirmation (or with `--yes`). Files are **not** moved to Finder Trash.
- Cache folders may be recreated by macOS or apps; some apps may need a restart after cleanup.
- **`apps remove`** can delete application bundles and related data—use only when you understand the removal plan.

---

## Privacy and permissions

Whirlpool runs locally. No telemetry or analytics is configured in this repository by default.

If macOS blocks reads under `~/Library`, grant **Full Disk Access** to your terminal host app under **System Settings → Privacy & Security → Full Disk Access** (e.g. Terminal, iTerm, Cursor, VS Code, Warp).

---

## FAQ

### Can Whirlpool break my Mac?

Use **`cache plan`** first and review output. Removal is irreversible; use **`--ignore`** for paths you want to keep.

### Does `cache clear` move files to Trash?

**No.** It deletes planned cache paths after confirmation (unless `--yes`).

### Does `apps remove` move apps to Trash?

**No.** It follows the interactive removal plan and deletes targeted paths on disk after confirmation.

### Does it clean browser cache?

Yes, by default known browser caches may be included. Use **`--no-browsers`** on cache commands to skip them.

### Does it work on Windows or Linux?

**No.** Paths and behavior assume **macOS** only.

### Is it a replacement for paid cleaner suites?

Whirlpool targets transparency and a CLI-first workflow—not a full commercial cleaner product.

---

## Roadmap

- Improve the TUI experience.
- Richer cleanup reports and exportable summaries.
- App-specific cleanup rules and leftover detection.
- More automated tests and docs (screenshots/GIFs).

---

## Contributing

Contributions are welcome. Good first steps:

- Documentation and examples.
- Tests and lint/format hygiene.
- Safer cleanup rules and edge-case reports.
- Support for additional cache locations.

Please read:

- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- [Issue and PR templates](.github/)

We recommend [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

---

## License

Licensed under the [Apache License, Version 2.0](LICENSE).

See the [NOTICE](NOTICE) file for attributions.

Copyright (c) 2026 Pedro Augusto Barbosa Aparecido.

---

## Acknowledgements

Built with [Typer](https://github.com/fastapi/typer), [Rich](https://github.com/Textualize/rich), [Textual](https://github.com/Textualize/textual), [Pydantic](https://github.com/pydantic/pydantic), and packaged with [uv](https://docs.astral.sh/uv/).
