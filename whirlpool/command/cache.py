from typing import override

import typer
from rich.console import Console

from whirlpool.command import Command
from whirlpool.disk.cache import CacheController, CacheOptions
from whirlpool.utils.format import Formatter


class CacheCommand(Command):
    def __init__(
        self,
        *,
        ignore: list[str] | None = None,
        include_browsers: bool = True,
        console: Console | None = None,
    ) -> None:
        super().__init__(console=console)
        options: CacheOptions = {
            "ignore": list(ignore) if ignore else [],
            "include_browsers": include_browsers,
        }
        self._cache_controller = CacheController(options, console=self._console)

    @override
    def run(self) -> None:
        self.run_plan()

    def run_plan(self) -> None:
        self._cache_controller.plan(show_report=True)

    def run_clear(self, *, assume_yes: bool, verbose: bool = False) -> None:
        self._cache_controller.plan(show_report=verbose)
        count, total_bytes = self._cache_controller.describe_plan()
        if count == 0:
            self._cache_controller.clear(show_report=True)
            return
        if not assume_yes:
            human = Formatter.format_filesize(total_bytes)
            if not typer.confirm(
                f"Remove {count} cache path(s) totaling {human}? "
                "This cannot be undone."
            ):
                raise typer.Exit(0)
        self._cache_controller.clear(show_report=True)
