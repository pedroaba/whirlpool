from collections.abc import Callable

import typer
from rich.console import Console

from whirlpool.disk.application import ApplicationDisk
from whirlpool.utils.file import FileUtils


class ApplicationCommandGroup:
    def __init__(
        self,
        *,
        console_factory: Callable[[], Console] | None = None,
    ) -> None:
        self._console_factory = console_factory or Console
        self._application_disk = ApplicationDisk()

        self.app = typer.Typer(
            name="apps",
            help=(
                "Lists the applications that consume the most resources on the system and "
                "allows uninstalling an app and "
                "removing all its data."
            ),
            no_args_is_help=True,
        )
        self.app.command(
            "list",
            help="Lists the applications that consume the most resources on the system.",
        )(self.list)
        self.app.command(
            "remove",
            help="Uninstalls an application and removes all its data.",
        )(self.remove)

    def list(
        self,
        is_enable_progress: bool = typer.Option(
            False,
            "--progress",
            "-p",
            help="Displays a progress bar during listing.",
        ),
        search_for_system_files: bool = typer.Option(
            False,
            "--with-system-files",
            "-sf",
            help="Search for application files in system directories.",
        ),
    ) -> None:
        console = self._console_factory()
        self._application_disk.initialize(
            with_progress=is_enable_progress, with_system_files=search_for_system_files
        )

        applications = self._application_disk.apps

        console.print(
            "[bold]Installed applications:[/bold]",
            style="bold",
        )

        for app in applications:
            size = FileUtils.human_readable_size(app.size)
            console.print(f"  - {app.name} [b]({size})[/b]")

    def remove(self) -> None:
        console = self._console_factory()
        console.print(
            "[yellow]Uninstall application feature under development.[/yellow]"
        )
