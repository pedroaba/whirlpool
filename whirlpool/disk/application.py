import os
import plistlib
import re
import shutil
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

from whirlpool.models.application import (
    Application,
    ApplicationRemovalPlan,
    ApplicationRemovalTarget,
)
from whirlpool.utils.file import FileUtils


class ApplicationDisk:
    """
    Represents the class responsible for listing installed applications on macOS.
    """

    _RELATED_PATH_DEPTHS: tuple[tuple[Path, int], ...] = (
        (Path.home() / "Library/Application Support", 3),
        (Path.home() / "Library/Caches", 3),
        (Path.home() / "Library/Containers", 2),
        (Path.home() / "Library/Group Containers", 2),
        (Path.home() / "Library/Logs", 3),
        (Path.home() / "Library/Preferences", 1),
        (Path.home() / "Library/Saved Application State", 1),
        (Path.home() / "Library/WebKit", 2),
        (Path.home() / "Library/HTTPStorages", 2),
        (Path.home() / "Library/Application Scripts", 1),
        (Path("/Library/Application Support"), 3),
        (Path("/Library/Caches"), 3),
        (Path("/Library/Logs"), 3),
        (Path("/Library/Preferences"), 1),
    )
    _CONTAINER_SUPPORT_RELATIVE_PATHS: tuple[Path, ...] = (
        Path("Data/Library/Application Support"),
        Path("Data/Library/Caches"),
        Path("Data/Library/Preferences"),
        Path("Data/Library/Logs"),
        Path("Data/Library/Saved Application State"),
        Path("Data/Library/WebKit"),
        Path("Data/Library/HTTPStorages"),
        Path("Library/Application Support"),
        Path("Library/Caches"),
        Path("Library/Preferences"),
        Path("Library/Logs"),
        Path("Library/Saved Application State"),
        Path("Library/WebKit"),
        Path("Library/HTTPStorages"),
    )

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

    def initialize(
        self,
        *,
        with_progress: bool = False,
        with_system_files: bool = True,
        include_sizes: bool = True,
    ) -> None:
        self._get_applications(
            with_progress=with_progress,
            with_system_files=with_system_files,
            include_sizes=include_sizes,
        )

    def _get_applications(
        self,
        *,
        with_progress: bool = False,
        with_system_files: bool = True,
        include_sizes: bool = True,
    ) -> None:
        """
        Obtains the list of applications installed on macOS from the `/Applications` directory or
        the user-provided directory, if specified.
        """
        self.__applications = []
        search_paths = self._get_search_paths(with_system_files=with_system_files)

        for search_path in search_paths:
            self._console.print(
                f"Searching for applications in [cyan]{search_path}[/cyan]..."
            )

        path_iterator = self._get_application_directories(search_paths)
        if include_sizes:
            self._console.print("Calculating disk usage for each application...")
        else:
            self._console.print("Loading installed applications...")

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
                    f"Scanning {search_paths[0]}...",
                    total=len(path_iterator),
                    total_of_bytes="Total calculated: 0 B",
                )

                for item in path_iterator:
                    if item.is_dir():
                        application = self._build_application(
                            item, include_sizes=include_sizes
                        )
                        total_of_bytes += application.size
                        progress.update(
                            task,
                            advance=1,
                            description=f"Scanning {item.name}...",
                            total_of_bytes=f"Total calculated: {FileUtils.human_readable_size(total_of_bytes)}",
                        )

                        self.__applications.append(application)

            if include_sizes:
                self._console.print(
                    f"Total disk usage: {FileUtils.human_readable_size(total_of_bytes)}"
                )

            return

        for item in path_iterator:
            self._console.print(f"[bold]{item.name}[/bold]")
            self.__applications.append(
                self._build_application(item, include_sizes=include_sizes)
            )

    def _get_search_paths(self, *, with_system_files: bool) -> list[Path]:
        search_paths = [Path("/Applications")]
        if self.__custom_path:
            search_paths = [self.__custom_path]

        if with_system_files:
            search_paths.append(Path("/System/Applications"))

        return [path for path in search_paths if path.exists()]

    def _get_application_directories(self, search_paths: list[Path]) -> list[Path]:
        applications_by_path: dict[Path, Path] = {}

        for search_path in search_paths:
            for item in search_path.iterdir():
                if item.is_dir():
                    applications_by_path[item.resolve()] = item

        return list(applications_by_path.values())

    def _build_application(self, item: Path, *, include_sizes: bool = True) -> Application:
        identifiers = self._get_application_identifiers(item)
        related_files: list[Path] = []
        total_size = 0

        if include_sizes:
            related_files = self._get_related_paths(item, identifiers=identifiers)
            total_size = FileUtils.sizeof(item) + sum(
                FileUtils.sizeof(path) for path in related_files
            )

        return Application(
            name=item.name,
            size=total_size,
            path=item,
            identifiers=sorted(identifiers["bundle_ids"]),
            system_files=related_files,
        )

    def build_removal_plan(
        self, application: Application, *, with_progress: bool = False
    ) -> ApplicationRemovalPlan:
        targets: list[ApplicationRemovalTarget] = []
        seen_paths: set[Path] = set()
        candidates = [
            ("application", application.path),
            *(
                ("system file", system_file_path)
                for system_file_path in application.system_files
            ),
        ]

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
                    f"Planning removal for {application.name}...",
                    total=len(candidates),
                    total_of_bytes="Total calculated: 0 B",
                )
                total_of_bytes = 0

                for kind, path in candidates:
                    target = self._build_removal_target(kind, path, seen_paths)
                    if target is None:
                        progress.update(task, advance=1)
                        continue

                    total_of_bytes += target.size
                    targets.append(target)
                    progress.update(
                        task,
                        advance=1,
                        description=f"Planning {path.name}...",
                        total_of_bytes=(
                            "Total calculated: "
                            f"{FileUtils.human_readable_size(total_of_bytes)}"
                        ),
                    )
        else:
            for kind, path in candidates:
                target = self._build_removal_target(kind, path, seen_paths)
                if target is not None:
                    targets.append(target)

        return ApplicationRemovalPlan(
            application=application,
            targets=sorted(targets, key=lambda target: str(target.path)),
        )

    def get_application_details(self, application_path: Path) -> Application:
        return self._build_application(application_path, include_sizes=True)

    def remove_application(
        self, plan: ApplicationRemovalPlan, *, with_progress: bool = False
    ) -> tuple[list[Path], list[Path]]:
        deleted_paths: list[Path] = []
        failed_paths: list[Path] = []
        sorted_targets = sorted(
            plan.targets,
            key=lambda removal_target: len(removal_target.path.parts),
            reverse=True,
        )

        if with_progress:
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
                    f"Removing {plan.application.name}...",
                    total=len(sorted_targets),
                    bytes_removed="Removed: 0 B",
                )
                removed_bytes = 0

                for target in sorted_targets:
                    deleted = self._delete_target(target.path)
                    if deleted:
                        deleted_paths.append(target.path)
                        removed_bytes += target.size
                    elif target.path.exists():
                        failed_paths.append(target.path)

                    progress.update(
                        task,
                        advance=1,
                        description=f"Removing {target.path.name}...",
                        bytes_removed=(
                            f"Removed: {FileUtils.human_readable_size(removed_bytes)}"
                        ),
                    )
        else:
            for target in sorted_targets:
                deleted = self._delete_target(target.path)
                if deleted:
                    deleted_paths.append(target.path)
                elif target.path.exists():
                    failed_paths.append(target.path)

        return deleted_paths, failed_paths

    def _build_removal_target(
        self, kind: str, path: Path, seen_paths: set[Path]
    ) -> ApplicationRemovalTarget | None:
        if not path.exists():
            return None

        resolved = path.resolve()
        if resolved in seen_paths:
            return None

        seen_paths.add(resolved)
        return ApplicationRemovalTarget(
            path=path,
            size=FileUtils.sizeof(path),
            kind=kind,
        )

    def _delete_target(self, path: Path) -> bool:
        if not path.exists():
            return False

        try:
            if path.is_symlink() or path.is_file():
                path.unlink(missing_ok=True)
            elif path.is_dir():
                shutil.rmtree(path, ignore_errors=False)
            else:
                return False
        except OSError:
            return False

        return True

    def _get_related_paths(
        self, application_path: Path, *, identifiers: dict[str, set[str]] | None = None
    ) -> list[Path]:
        if identifiers is None:
            identifiers = self._get_application_identifiers(application_path)
        if not identifiers["bundle_ids"] and not identifiers["normalized_names"]:
            return []

        matches_by_resolved_path: dict[Path, Path] = {}

        for root_path, max_depth in self._RELATED_PATH_DEPTHS:
            if not root_path.exists():
                continue

            for candidate in self._iter_candidates(root_path, max_depth=max_depth):
                if not self._is_related_path(candidate, identifiers):
                    continue

                for expanded_candidate in self._expand_related_candidate(candidate):
                    try:
                        resolved = expanded_candidate.resolve()
                    except OSError:
                        continue

                    if any(
                        parent in matches_by_resolved_path
                        for parent in resolved.parents
                    ):
                        continue

                    matches_by_resolved_path = {
                        path: original
                        for path, original in matches_by_resolved_path.items()
                        if resolved not in path.parents
                    }
                    matches_by_resolved_path[resolved] = expanded_candidate

        return list(matches_by_resolved_path.values())

    def _get_application_identifiers(
        self, application_path: Path
    ) -> dict[str, set[str]]:
        app_names = {
            application_path.stem,
            application_path.name.removesuffix(".app"),
        }
        bundle_ids: set[str] = set()

        info_plist_path = application_path / "Contents/Info.plist"
        if info_plist_path.exists():
            try:
                with info_plist_path.open("rb") as info_plist_file:
                    metadata = plistlib.load(info_plist_file)
            except (OSError, plistlib.InvalidFileException):
                metadata = {}

            for key in ("CFBundleIdentifier",):
                value = metadata.get(key)
                if isinstance(value, str) and value.strip():
                    bundle_ids.add(value.strip())

            for key in ("CFBundleName", "CFBundleDisplayName"):
                value = metadata.get(key)
                if isinstance(value, str) and value.strip():
                    app_names.add(value.strip())

        normalized_names = {
            self._normalize_identifier(name)
            for name in app_names
            if self._normalize_identifier(name)
        }

        return {
            "bundle_ids": bundle_ids,
            "normalized_names": normalized_names,
        }

    def _iter_candidates(self, root_path: Path, *, max_depth: int) -> list[Path]:
        candidates: list[Path] = []
        base_depth = len(root_path.parts)

        for current_root, dirs, files in os.walk(
            root_path, topdown=True, followlinks=False
        ):
            current_path = Path(current_root)
            rel_depth = len(current_path.parts) - base_depth

            if rel_depth >= max_depth:
                dirs[:] = []

            for directory in dirs:
                candidates.append(current_path / directory)

            for file_name in files:
                candidates.append(current_path / file_name)

        return candidates

    def _is_related_path(
        self, candidate: Path, identifiers: dict[str, set[str]]
    ) -> bool:
        bundle_ids = identifiers["bundle_ids"]
        normalized_names = identifiers["normalized_names"]

        candidate_name = candidate.name
        candidate_stem = candidate.stem
        normalized_candidate_name = self._normalize_identifier(candidate_name)
        normalized_candidate_stem = self._normalize_identifier(candidate_stem)

        if candidate_name in bundle_ids or candidate_stem in bundle_ids:
            return True

        if any(candidate_name.endswith(f".{bundle_id}") for bundle_id in bundle_ids):
            return True

        if normalized_candidate_name in normalized_names:
            return True

        if candidate.is_file() and normalized_candidate_stem in normalized_names:
            return True

        if (
            candidate.name.endswith(".savedState")
            and normalized_candidate_stem in normalized_names
        ):
            return True

        return False

    def _expand_related_candidate(self, candidate: Path) -> list[Path]:
        container_root = Path.home() / "Library/Containers"
        group_container_root = Path.home() / "Library/Group Containers"

        if self._is_within_root(candidate, container_root) or self._is_within_root(
            candidate, group_container_root
        ):
            return [
                support_path
                for relative_path in self._CONTAINER_SUPPORT_RELATIVE_PATHS
                if (support_path := candidate / relative_path).exists()
            ]

        return [candidate]

    def _is_within_root(self, candidate: Path, root: Path) -> bool:
        return root == candidate or root in candidate.parents

    def _normalize_identifier(self, value: str) -> str:
        normalized = value.casefold().strip()
        normalized = normalized.removesuffix(".app")
        normalized = re.sub(r"\.(plist|savedstate)$", "", normalized)
        normalized = re.sub(r"[^a-z0-9]+", "", normalized)
        return normalized
