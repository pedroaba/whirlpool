from pathlib import Path

from rich.console import Console
from rich.progress import (
    BarColumn,
    Progress,
    SpinnerColumn,
    TaskProgressColumn,
    TextColumn,
    TimeElapsedColumn,
)

from whirlpool.models.application import Application
from whirlpool.utils.file import FileUtils


class ApplicationDisk:
    """
    Represents the class responsible for listing installed applications on macOS.
    """

    def __init__(
        self, custom_path: Path | str | None = None, *, console: Console | None = None
    ):
        self.__applications: list[Application] = []
        self.__custom_path: Path | None = Path(custom_path) if custom_path else None

        self._console: Console = console or Console()

    @property
    def apps(self) -> list[Application]:
        return self.__applications

    def set_custom_path(self, path: Path | str) -> None:
        if not isinstance(path, Path):
            path = Path(path)

        if not path.exists():
            raise FileNotFoundError(f"Path not found: {path}")

        self.__custom_path = path

    def initialize(self, *, with_progress: bool = False) -> None:
        self._get_applications(with_progress=with_progress)

    def _get_applications(
        self, *, with_progress: bool = False, with_system_files: bool = False
    ) -> None:
        """
        Obtains the list of applications installed on macOS from the `/Applications` directory or
        the user-provided directory, if specified.
        """
        path = self.__custom_path if self.__custom_path else Path("/Applications")
        self._console.print(f"Searching for applications in [cyan]{path}[/cyan]...")
        path_iterator = list(path.iterdir())
        self._console.print("Calculating disk usage for each application...")

        total_of_bytes = 0

        if with_progress:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TaskProgressColumn(),
                TimeElapsedColumn(),
                TextColumn("{task.fields[total_of_bytes]}"),
                console=self._console,
                transient=True,
            ) as progress:
                task = progress.add_task(
                    f"Scanning {path}...",
                    total=len(path_iterator),
                    total_of_bytes="Total calculated: 0 B",
                )

                for item in path_iterator:
                    if item.is_dir():
                        sizeof_application = FileUtils.sizeof(item)
                        total_of_bytes += sizeof_application
                        progress.update(
                            task,
                            advance=1,
                            description=f"Scanning {item.name}...",
                            total_of_bytes=f"Total calculated: {FileUtils.human_readable_size(total_of_bytes)}",
                        )

                        self.__applications.append(
                            Application(
                                name=item.name, size=sizeof_application, path=item
                            )
                        )

            self._console.print(
                f"Total disk usage: {FileUtils.human_readable_size(total_of_bytes)}"
            )

            return

        for item in path.iterdir():
            if item.is_dir():
                self._console.print(f"[bold]{item.name}[/bold]")
                sizeof_application = FileUtils.sizeof(item)
                self.__applications.append(
                    Application(name=item.name, size=sizeof_application, path=item)
                )
