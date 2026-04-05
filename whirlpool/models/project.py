from dataclasses import dataclass, field

from whirlpool import __version__


@dataclass(slots=True)
class ProjectMetadata:
    name: str = "Whirlpool"
    description: str = (
        "Uma interface de linha de comando (CLI) "
        "para facilitar tarefas de limpeza, manutenção e otimização no macOS."
    )
    version: str = field(default=__version__)
