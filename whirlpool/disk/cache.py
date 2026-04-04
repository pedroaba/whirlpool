import re
import shutil
from pathlib import Path
from typing import Optional, TypedDict

from rich.console import Console
from rich.panel import Panel
from rich.progress import (
    BarColumn,
    Progress,
    SpinnerColumn,
    TaskProgressColumn,
    TextColumn,
    TimeElapsedColumn,
)
from rich.table import Table

from whirlpool.disk.default import BROWSER_CACHE_DIRS_PATHS, USER_CACHE_DIR
from whirlpool.utils.file import FileUtils
from whirlpool.utils.format import Formatter


class CacheOptions(TypedDict):
    ignore: list[str]
    include_browsers: Optional[bool]


type CacheBuffer = tuple[int, Path]
type CacheBufferedPlan = list[CacheBuffer]


class CacheController:
    def __init__(self, options: CacheOptions, *, console: Console | None = None):
        self.user_cache_dir = USER_CACHE_DIR
        self.browser_cache_dirs_paths = BROWSER_CACHE_DIRS_PATHS

        self._buffered_cache: CacheBufferedPlan = []

        self._ignore_paths: list[str] = options.get("ignore", [])
        self._include_browsers: bool | None = options.get("include_browsers", True)

        self._console = console or Console()

    def plan(self, *, show_report: bool = False):
        plans: CacheBufferedPlan = []
        total_bytes_to_clean = 0
        seen = set()

        entries: list[Path] = []
        if self.user_cache_dir.exists() and not self._is_ignored(
            str(self.user_cache_dir), self._ignore_paths
        ):
            for entry in self.user_cache_dir.iterdir():
                if entry.name.startswith("."):
                    continue
                if not entry.exists() or self._is_ignored(
                    str(entry), self._ignore_paths
                ):
                    continue
                normalized_path = re.sub(r"\/", "", str(entry.resolve()))
                if normalized_path in seen:
                    continue

                seen.add(normalized_path)
                entries.append(entry)

        if self._include_browsers:
            for browser_entry in self.browser_cache_dirs_paths:
                if browser_entry.name.startswith("."):
                    continue
                if not browser_entry.exists() or self._is_ignored(
                    str(browser_entry), self._ignore_paths
                ):
                    continue
                normalized_path = re.sub(r"\/", "", str(browser_entry.resolve()))
                if normalized_path in seen:
                    continue

                seen.add(normalized_path)
                entries.append(browser_entry)

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            TimeElapsedColumn(),
            TextColumn("{task.fields[total_bytes_to_clean_humanized]}"),
            console=self._console,
            transient=True,
        ) as progress:
            task = progress.add_task(
                "Scanning cache...",
                total=len(entries),
                total_bytes_to_clean_humanized="Total calculated: 0 B",
            )

            for entry in entries:
                progress.update(task, description=f"Scanning {entry.name}...")

                size = FileUtils.sizeof(entry)
                plans.append((size, entry))
                total_bytes_to_clean += size

                human = Formatter.format_filesize(total_bytes_to_clean)
                progress.update(
                    task,
                    total_bytes_to_clean_humanized=(
                        f"Total calculated: {human}"
                    ),
                )
                progress.advance(task)

        self._buffered_cache = plans
        if show_report:
            self._show_plan_report(
                plans,
                total_bytes_to_clean,
            )

        return self

    def describe_plan(self) -> tuple[int, int]:
        """Return (entry_count, total_bytes) for the current buffered plan."""
        total = sum(size for size, _ in self._buffered_cache)
        return len(self._buffered_cache), total

    def clear(self, *, show_report: bool = False):
        targets = [(size, entry) for size, entry in self._buffered_cache]
        total_bytes_removed = 0

        if not targets:
            self._console.print("[yellow]Nothing to clear.[/yellow]")
            return {
                "deleted_paths": [],
                "total_bytes_removed": 0,
                "total_bytes_removed_humanized": Formatter.format_filesize(0),
            }

        deleted_paths: list[Path] = []

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            TimeElapsedColumn(),
            TextColumn("{task.fields[bytes_removed]}"),
            console=self._console,
            transient=True,
        ) as progress:
            task = progress.add_task(
                "Clearing cache...",
                total=len(targets),
                bytes_removed="Removed: 0 B",
            )

            for size, target in targets:
                progress.update(task, description=f"Deleting {target.name}...")

                try:
                    if target.is_symlink() or target.is_file():
                        target.unlink(missing_ok=True)
                    elif target.is_dir():
                        shutil.rmtree(target, ignore_errors=False)

                    deleted_paths.append(target)
                    total_bytes_removed += size
                except OSError:
                    pass

                progress.update(
                    task,
                    bytes_removed=(
                        f"Removed: {Formatter.format_filesize(total_bytes_removed)}"
                    ),
                )
                progress.advance(task)

        if show_report:
            self._show_clear_report(self._buffered_cache, total_bytes_removed)

        self._buffered_cache = []
        return {
            "deleted_paths": deleted_paths,
            "total_bytes_removed": total_bytes_removed,
            "total_bytes_removed_humanized": Formatter.format_filesize(
                total_bytes_removed
            ),
        }

    def _is_ignored(self, target: str, ignores: list[str]) -> bool:
        norm = target.rstrip("/")
        for ign in ignores:
            i = ign.rstrip("/")
            if norm == i or norm.startswith(f"{i}/"):
                return True

        return False

    def _show_plan_report(
        self, paths_to_delete: CacheBufferedPlan, total_bytes_to_delete: int
    ):
        report = {
            "paths_to_clean": paths_to_delete,
            "total_bytes_to_clean": total_bytes_to_delete,
            "total_bytes_to_clean_humanized": Formatter.format_filesize(
                total_bytes_to_delete
            ),
        }

        summary = Table.grid(padding=(0, 2))
        summary.add_row("Items found", str(len(report["paths_to_clean"])))
        summary.add_row("Total size", report["total_bytes_to_clean_humanized"])

        self._console.print(
            Panel.fit(
                summary,
                title="Cache Report",
                border_style="cyan",
            )
        )

        table = Table(title="Largest Cache Paths", header_style="bold magenta")
        table.add_column("#", justify="right", style="dim")
        table.add_column("Path", style="white", overflow="fold")
        table.add_column("Size", justify="right", style="green")

        for index, (size, path) in enumerate(
            sorted(report["paths_to_clean"], key=lambda item: item[0], reverse=True),
            start=1,
        ):
            table.add_row(str(index), str(path), Formatter.format_filesize(size))
        self._console.print(table)

    def _show_clear_report(
        self, deleted_items: CacheBufferedPlan, total_bytes_removed: int
    ):
        report = {
            "deleted_paths": deleted_items,
            "total_bytes_removed": total_bytes_removed,
            "total_bytes_removed_humanized": Formatter.format_filesize(
                total_bytes_removed
            ),
        }

        summary = Table.grid(padding=(0, 2))
        summary.add_row("Items deleted", str(len(report["deleted_paths"])))
        summary.add_row("Space recovered", report["total_bytes_removed_humanized"])

        self._console.print(
            Panel.fit(
                summary,
                title="Clear Report",
                border_style="green",
            )
        )

        table = Table(title="Deleted Cache Paths", header_style="bold red")
        table.add_column("#", justify="right", style="dim")
        table.add_column("Path", style="white", overflow="fold")
        table.add_column("Recovered", justify="right", style="green")

        for index, (size, path) in enumerate(
            sorted(report["deleted_paths"], key=lambda item: item[0], reverse=True),
            start=1,
        ):
            table.add_row(str(index), str(path), Formatter.format_filesize(size))

        self._console.print(table)
