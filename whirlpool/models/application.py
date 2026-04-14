from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field


class Application(BaseModel):
    """
    Represents an application installed on macOS and basic metadata.
    """

    model_config = ConfigDict(
        frozen=True,
    )

    name: str
    size: int = Field(ge=0, description="Size in bytes occupied by the application")
    path: Path

    system_files: list[Path] = Field(default_factory=list)


class SystemFile(BaseModel):
    model_config = ConfigDict(
        frozen=True,
    )

    path: Path
    size: int = Field(ge=0, description="Size in bytes occupied by the file")
