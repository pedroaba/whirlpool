# Contributing to Whirlpool

Thanks for your interest in improving this project. This document explains how to work in the repository and what we expect from contributions.

This project adopts the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Scope and platform

- **Whirlpool** targets **macOS** only (paths and behavior assume a Mac user layout).
- The codebase is **Python 3.14+**, packaged with **[uv](https://docs.astral.sh/uv/)** and built with **`uv_build`** (see [README.md](README.md)).

## Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) installed
- **Python 3.14+** (uv can install a matching interpreter via `.python-version` if you use `uv python`)
- A Mac to run and test the CLI realistically (caches under `~/Library`, permissions, etc.)

## Getting started

From the repository root:

```bash
uv sync
uv sync --extra dev   # Black, isort, Flake8, pytest, taskipy
```

Run the CLI during development:

```bash
uv run whirlpool --help
uv run whirlpool cache plan
```

Or the package entry point:

```bash
uv run python -m whirlpool
```

See [README.md](README.md) for command reference and task shortcuts.

## Checks before you open a PR

Run from the **repository root** (with dev dependencies installed):

```bash
uv run --extra dev flake8 .
uv run --extra dev black --check .
uv run --extra dev isort --check-only .
uv run --extra dev pytest tests -v    # when tests exist
```

Or use **taskipy**:

```bash
uv run --extra dev task lint
uv run --extra dev task format   # applies Black + isort (review the diff)
uv run --extra dev task test
```

Fix any reported issues in the files you touched.

## Code style

- Match existing **naming**, **imports**, and **patterns** in the files you edit.
- **Comments and user-facing CLI strings** are expected to be in **English** unless a file already establishes another convention for a specific audience.
- Prefer **small, focused changes**; avoid drive-by refactors unrelated to your fix or feature.
- **Do not commit** secrets, API keys, machine-specific paths, or **`__pycache__` / `.pyc`** artifacts. Add or respect ignore rules if you introduce new build outputs.

## Commits and pull requests

- Use **clear commit messages**. We recommend [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `fix(cli): …`, `feat(whirlpool): …`, `docs(readme): …`).
- When opening an issue or PR, please use the templates in [`.github/`](.github/) so we can triage faster.
- In the PR description, explain **what** changed and **why**, and how you **verified** it (commands you ran, manual checks on macOS).
- Link related **issues** or discussions when applicable.

## Safety and privacy

Whirlpool can **inspect** and **delete** files depending on the command. When testing:

- **`cache plan`** is read-only; use it to see what **`cache clear`** would target.
- **`cache clear`** removes planned paths from disk (not Finder Trash) after confirmation unless you pass **`--yes`**. Test on disposable data or a throwaway user when possible.
- **`apps remove`** can delete application bundles and related data after confirmation in the TUI. Exercise extreme caution; prefer VMs or test accounts when validating destructive paths.
- Do not assume CI covers all macOS behaviors; call out **manual** test steps in the PR when relevant.

## Project layout

- **`whirlpool/`** — Python package: `cli.py` (Typer app wiring), `models/` (e.g. `ProjectMetadata`), `command/` (command objects and Typer groups such as `cache_group.py`, `application_group.py`), `disk/` (cache and disk logic), `utils/`.
- **`main.py`** — thin entry that delegates to the CLI (optional local runner).
- **`pyproject.toml`** — project metadata, dependencies, `uv_build` settings, and tool config (Black, isort, Flake8, pytest, taskipy).

## Legal

This project is licensed under the [Apache License, Version 2.0](LICENSE).
By submitting a contribution, you agree that your work will be licensed under
the same terms (Apache-2.0). Per Section 5 of the license, contributions you
intentionally submit for inclusion are licensed to the project and its users
under those terms, without any additional conditions.

See [NOTICE](NOTICE) for project attributions.

## Questions

If something is missing here or ambiguous, open an issue or discussion with the maintainers (as your repo workflow allows).
