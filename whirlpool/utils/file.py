import os
from pathlib import Path

from whirlpool.utils.format import Formatter


class FileUtils:
    @staticmethod
    def get_size(file_path: str) -> int:
        return os.path.getsize(file_path)

    @staticmethod
    def sizeof(target: Path, max_depth: int = 25) -> int:
        if not target.exists():
            return 0

        total_size = 0
        base_depth = len(target.parts)

        for root, dirs, files in os.walk(target, topdown=True, followlinks=False):
            root_path = Path(root)

            try:
                rel_depth = len(root_path.parts) - base_depth
            except OSError:
                continue

            if rel_depth >= max_depth:
                dirs[:] = []

            for file in files:
                file_path = root_path / file
                try:
                    if file_path.is_symlink():
                        continue
                    total_size += file_path.lstat().st_size
                except OSError:
                    continue

        return total_size

    @staticmethod
    def human_readable_size(size: int) -> str:
        return Formatter.format_filesize(size)
