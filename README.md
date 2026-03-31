# Whirlpool

Recover disk space on **macOS** with **low‑risk cleanup** workflows: inspect disk usage, find app remnants under `~/Library`, manage caches, and work with Finder Trash.

- **Safer by design**: read‑only scans + “move to Trash” flows (recoverable) instead of irreversible deletes.
- **Honest output**: shows sizes and conservative “reason” labels; false positives are possible and explicitly expected.
- **Practical tools**: disk overview, app remnant discovery, cache measurement/cleanup, Trash list/empty.

> Note: v1 is **macOS‑only**.

## Why it’s safer than typical “cleaners”

Whirlpool is built around **recovery and user intent**:

- **Scan is read‑only**: it inspects and reports candidates before any changes.
- **Cleanup is recoverable**: primary cleanup flows move items to **Finder Trash** so you can restore them.
- **Confirmation and dry‑runs**: destructive steps require explicit confirmation and support simulation modes.

## What it can do

- **Disk status**: used / free / total for your boot volume.
- **App remnant scan**: find leftover data tied to installed apps (common `~/Library/*` locations).
- **Cache cleanup**: measure and clean planned cache paths (config‑driven).
- **Trash tools**: list what’s in `~/.Trash`, and empty Trash when you decide.

## Get it / run it

### Option A — Whirlpool.app (drag to Applications)

This repo can produce a **Whirlpool.app** you can run like a normal macOS app, including passing CLI args.

Example:

```bash
open -a Whirlpool --args disk
```

Build / install details:
- [`apps/cli/README.md`](apps/cli/README.md#whirlpoolapp-bundle-id-compedroabawhirlpool)

### Option B — CLI on your PATH (standalone binary)

Install `whirlpool` to your PATH as a compiled standalone executable.

Example install:

```bash
bun run install-cli
```

First commands:

```bash
whirlpool disk
whirlpool scan Safari
whirlpool trash list
```

Exact flags and command reference:
- [`apps/cli/README.md`](apps/cli/README.md#command-reference)

## Privacy & permissions

- **Local-first**: Whirlpool runs locally on your machine. No telemetry by default.
- **Full Disk Access (Trash)**: some Trash operations may require macOS **Full Disk Access** for the host app (Terminal, Cursor, iTerm, etc.). If you see permission errors for `~/.Trash`, grant access under **Privacy & Security → Full Disk Access** and retry.\n\nMore context (and a deep link helper):\n- [`packages/platform/README.md`](packages/platform/README.md)

## FAQ

### Can this break my Mac?

Whirlpool is designed to be conservative: it prefers **reporting first** and uses **Trash** as a safety net. Still, you should review candidates—macOS data can be shared across apps, and heuristics can produce false positives.

### Does it delete files permanently?

Some commands can **empty Trash**, which is permanent. The main “cleanup” workflow is designed to be **recoverable** (move to Trash) unless you explicitly choose otherwise.

### Why doesn’t it always know which app created a file?

Many filesystem entries don’t store a reliable “created by app” field. Whirlpool only shows app attribution when there is evidence (path patterns or metadata); otherwise it reports **unknown**.\n\nProduct rationale:\n- [`docs/PRD-whirlpool-cli.md`](docs/PRD-whirlpool-cli.md#6-metadados--honestidade-de-produto)

### Does it work on Windows or Linux?

Not in v1. The current release targets **macOS only**.

## Developers / contributors

Technical docs are kept in internal READMEs:

- **CLI reference & build**: [`apps/cli/README.md`](apps/cli/README.md)
- **Contributing**: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- **Product PRD**: [`docs/PRD-whirlpool-cli.md`](docs/PRD-whirlpool-cli.md)
- **Workspace packages**:
  - [`packages/cleanup/README.md`](packages/cleanup/README.md)
  - [`packages/config/README.md`](packages/config/README.md)
  - [`packages/disk/README.md`](packages/disk/README.md)
  - [`packages/explore/README.md`](packages/explore/README.md)
  - [`packages/format/README.md`](packages/format/README.md)
  - [`packages/fs-meta/README.md`](packages/fs-meta/README.md)
  - [`packages/logging/README.md`](packages/logging/README.md)
  - [`packages/platform/README.md`](packages/platform/README.md)
  - [`packages/system-apps/README.md`](packages/system-apps/README.md)
  - [`packages/taxonomy/README.md`](packages/taxonomy/README.md)

## License

Proprietary — see [`LICENSE`](LICENSE). All rights reserved; no use or redistribution except under written agreement with the licensor.
