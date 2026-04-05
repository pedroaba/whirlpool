from collections.abc import Callable

import typer
from rich.console import Console


class ApplicationCommandGroup:
    def __init__(
        self,
        *,
        console_factory: Callable[[], Console] | None = None,
    ) -> None:
        self._console_factory = console_factory or Console
        self.app = typer.Typer(
            name="apps",
            help=(
                "Lista os aplicativos que mais consomem recursos no sistema e "
                "permite desinstalar um app e "
                "removendo todos os seus dados."
            ),
            no_args_is_help=True,
        )
        self.app.command(
            "list",
            help="Lista os aplicativos que mais consomem recursos no sistema.",
        )(self.list)
        self.app.command(
            "uninstall",
            help="Desinstala um aplicativo e remove todos os seus dados.",
        )(self.uninstall)

    def list(self) -> None:
        console = self._console_factory()
        console.print(
            "[yellow]Funcionalidade 'listar aplicativos' em "
            "desenvolvimento.[/yellow]"
        )

    def uninstall(self) -> None:
        console = self._console_factory()
        console.print(
            "[yellow]Funcionalidade 'desinstalar aplicativo' em "
            "desenvolvimento.[/yellow]"
        )
