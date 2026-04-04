from abc import abstractmethod

from rich.console import Console


class Command:
    def __init__(self, *, console: Console | None = None) -> None:
        self._console = console or Console()

    @abstractmethod
    def run(self) -> None:
        raise NotImplementedError()
