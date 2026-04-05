from collections.abc import Callable

import typer

from whirlpool.command.application_group import ApplicationCommandGroup
from whirlpool.command.cache_group import CacheCommandGroup
from whirlpool.models.project import ProjectMetadata


def _build_root_callback(version: str) -> Callable[..., None]:
    def version_callback(value: bool) -> None:
        if value:
            typer.echo(version)
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

    return root_callback


class WhirlpoolCLI:
    def __init__(
        self,
        metadata: ProjectMetadata,
        cache_command_group: CacheCommandGroup,
        application_command_group: ApplicationCommandGroup,
    ) -> None:
        self.metadata = metadata
        self.cache_command_group = cache_command_group
        self.application_command_group = application_command_group
        self.app = typer.Typer(
            name="whirlpool",
            help=metadata.description,
            no_args_is_help=True,
        )
        self.app.callback()(_build_root_callback(metadata.version))
        self.app.add_typer(cache_command_group.app, name="cache")
        self.app.add_typer(application_command_group.app, name="apps")

    @classmethod
    def create_default(cls) -> "WhirlpoolCLI":
        return cls(
            metadata=ProjectMetadata(),
            cache_command_group=CacheCommandGroup(),
            application_command_group=ApplicationCommandGroup(),
        )

    def run(self) -> None:
        self.app()


cli = WhirlpoolCLI.create_default()
app = cli.app


def main() -> None:
    cli.run()
