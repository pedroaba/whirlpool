from collections.abc import Callable
from typing import Annotated

import typer
from rich.console import Console

from whirlpool.disk.cache import CacheController


class CacheCommandGroup:
    """Typer sub-app for `whirlpool cache` commands."""

    def __init__(
        self,
        *,
        console_factory: Callable[[], Console] | None = None,
    ) -> None:
        self._console_factory = console_factory or Console
        self.app = typer.Typer(
            help="Inspect and clear user and browser caches.",
            no_args_is_help=True,
        )
        self.app.command(
            "plan",
            help=(
                "Shows a cache summary and the paths that would be removed "
                "(does not delete anything)."
            ),
        )(self.plan)
        self.app.command(
            "clear",
            help="Removes the caches listed in the plan (confirmation or --yes).",
        )(self.clear)

    def plan(
        self,
        no_browsers: bool = typer.Option(
            False,
            "--no-browsers",
            help="Do not include known browser cache directories.",
        ),
        ignore: Annotated[
            list[str],
            typer.Option(
                "--ignore",
                help="Exclude paths matching this prefix (repeatable).",
            ),
        ] = [],
        show_report: Annotated[
            bool,
            typer.Option(
                "--show-report",
                "-r",
                help="Show the report after the plan is executed.",
            ),
        ] = True,
    ) -> None:
        cache_controller = CacheController(
            {
                "ignore": list(ignore),
                "include_browsers": not no_browsers,
            },
            console=self._console_factory(),
        )

        cache_controller.plan(show_report=show_report)

    def clear(
        self,
        yes: bool = typer.Option(
            False,
            "--yes",
            "-y",
            help="Skip confirmation prompt.",
        ),
        verbose: bool = typer.Option(
            False,
            "--verbose",
            "-v",
            help="Show the same plan report as `cache plan` before confirming.",
        ),
        no_browsers: bool = typer.Option(
            False,
            "--no-browsers",
            help="Do not include known browser cache directories.",
        ),
        ignore: Annotated[
            list[str],
            typer.Option(
                "--ignore",
                help="Exclude paths matching this prefix (repeatable).",
            ),
        ] = [],
        show_report: Annotated[
            bool,
            typer.Option(
                "--show-report",
                "-r",
                help="Show the report after the plan is executed.",
            ),
        ] = True,
    ) -> None:
        cache_controller = CacheController(
            {
                "ignore": list(ignore),
                "include_browsers": not no_browsers,
            },
            console=self._console_factory(),
        )
        cache_controller.clear(show_report=show_report)
