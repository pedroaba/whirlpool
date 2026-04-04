from dataclasses import dataclass, field
from typing import Annotated

import typer
from rich.console import Console

from whirlpool import __version__
from whirlpool.command.cache import CacheCommand


@dataclass(slots=True)
class ProjectMetadata:
    name: str = "Whirlpool"
    description: str = (
        "Uma interface de linha de comando (CLI) "
        "para facilitar tarefas de limpeza, manutenção e otimização no macOS."
    )
    version: str = field(default=__version__)


class WhirlpoolCLI:
    """Class-based Typer application entry."""

    def __init__(self) -> None:
        self.metadata = ProjectMetadata()
        self._cli_app = typer.Typer(
            name="whirlpool",
            help=self.metadata.description,
            no_args_is_help=True,
        )
        self._cache_app = typer.Typer(
            help="Inspecionar e limpar caches do usuário e de navegadores.",
            no_args_is_help=True,
        )
        self._cli_app.add_typer(self._cache_app, name="cache")
        self._register_root_callback()
        self._register_cache_plan_command()
        self._register_cache_clear_command()

    def run(self) -> None:
        self._cli_app()

    def _register_root_callback(self) -> None:
        version_str = self.metadata.version

        def version_callback(value: bool) -> None:
            if value:
                typer.echo(version_str)
                raise typer.Exit(0)

        def root_callback(
            _version: bool = typer.Option(
                False,
                "--version",
                "-V",
                help="Show version and exit.",
                callback=version_callback,
                is_eager=True,
            ),
        ) -> None:
            pass

        self._cli_app.callback()(root_callback)

    def _register_cache_plan_command(self) -> None:
        def cache_plan_handler(
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
        ) -> None:
            self._run_cache_plan(no_browsers=no_browsers, ignore=ignore)

        self._cache_app.command(
            "plan",
            help=(
                "Mostra resumo do cache e os caminhos que seriam removidos "
                "(não apaga nada)."
            ),
        )(cache_plan_handler)

    def _register_cache_clear_command(self) -> None:
        def cache_clear_handler(
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
        ) -> None:
            self._run_cache_clear(
                yes=yes,
                verbose=verbose,
                no_browsers=no_browsers,
                ignore=ignore,
            )

        self._cache_app.command(
            "clear",
            help="Remove os caches listados no plano (confirmação ou --yes).",
        )(cache_clear_handler)

    def _run_cache_plan(self, *, no_browsers: bool, ignore: list[str]) -> None:
        console = Console()
        command = CacheCommand(
            ignore=list(ignore),
            include_browsers=not no_browsers,
            console=console,
        )
        command.run_plan()

    def _run_cache_clear(
        self,
        *,
        yes: bool,
        verbose: bool,
        no_browsers: bool,
        ignore: list[str],
    ) -> None:
        console = Console()
        command = CacheCommand(
            ignore=list(ignore),
            include_browsers=not no_browsers,
            console=console,
        )
        command.run_clear(assume_yes=yes, verbose=verbose)


def main() -> None:
    WhirlpoolCLI().run()
