# Contributing to macos-cleaner / whirlpool

Thanks for your interest in improving this project. This document explains how to work in the monorepo and what we expect from contributions.

## Scope and platform

- **whirlpool** is **macOS-only** (`assertMacOS()` on startup). Changes should keep that assumption unless the maintainers explicitly extend support.
- The codebase is **TypeScript**, managed with **Bun** and **Turborepo** (see [README.md](README.md)).

## Prerequisites

- [Bun](https://bun.com) (same major version as `packageManager` in the root `package.json`)
- A Mac to run and test the CLI realistically (disk, Trash, Full Disk Access, etc.)

## Getting started

From the repository root:

```bash
bun install
```

Run the CLI during development (use `--` before flags when calling through `bun`):

```bash
bun apps/cli/src/index.ts -- --help
bun apps/cli/src/index.ts disk
```

See [apps/cli/README.md](apps/cli/README.md) for command reference.

## Checks before you open a PR

Run from the **repository root**:

```bash
bun run check-types   # TypeScript across workspaces
bun run lint          # ESLint (per package)
```

Fix any reported issues in the packages you touched.

Optional:

```bash
bun run build         # turbo build (all packages that define build)
bun run build:cli     # compile standalone whirlpool binary
```

## Code style

- Match existing **naming**, **imports**, and **patterns** in the files you edit.
- **Comments and user-facing CLI strings** in this repo are expected to be in **English** unless a file already establishes another convention for a specific audience.
- Prefer **small, focused changes**; avoid drive-by refactors unrelated to your fix or feature.
- **Do not commit** secrets, API keys, or machine-specific paths.

## Commits and pull requests

- Use **clear commit messages**. We recommend [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `fix(cli): …`, `feat(explore): …`, `docs(readme): …`).
- In the PR description, explain **what** changed and **why**, and how you **verified** it (commands you ran, manual checks on macOS).
- Link related **issues** or discussions when applicable.

## Safety and privacy

**whirlpool** can **list**, **move to Trash**, or **delete** user data depending on the command. When testing:

- Prefer **dry-run** flags where available (`scan` is read-only; use caution with `orphans-clean`, `cache clean`, `trash clear`).
- Do not assume CI covers all macOS behaviors; call out **manual** test steps in the PR when relevant.

## Project layout

Workspace packages live under `packages/*`; the CLI is under `apps/cli`. Per-package notes live in each `README.md`. Start with the root [README.md](README.md) **Workspace layout** table.

## Legal

The project is **proprietary** (see [LICENSE](LICENSE)). By contributing, you confirm that your submission is compatible with the terms the maintainers apply to this repository (e.g. you have the right to grant the necessary permissions for the contribution to be merged and used in the project). If you are unsure, ask the maintainers before opening a large change.

## Questions

If something is missing here or ambiguous, open an issue or discussion with the maintainers (as your repo workflow allows).
