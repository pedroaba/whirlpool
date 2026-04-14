from pydantic import BaseModel, ConfigDict, Field

from whirlpool import __version__


class ProjectMetadata(BaseModel):
    """
    Basic Whirlpool project metadata for display in the CLI.
    """

    model_config = ConfigDict(
        frozen=True,
    )

    name: str = Field(default="Whirlpool")
    description: str = Field(
        default=(
            "A command-line interface (CLI) "
            "to facilitate cleanup, maintenance, and optimization tasks on macOS."
        )
    )
    version: str = Field(default=__version__)
