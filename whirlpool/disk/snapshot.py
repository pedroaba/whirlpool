from dataclasses import dataclass
from pathlib import Path


@dataclass
class DiskSnapshotOutput:
    mount_point: str
    total_bytes: int
    available_bytes: int
    used_bytes: int


class DiskSnapshot:
    def __init__(self, mount_root: Path) -> None:
        self.mount_root = mount_root

    def get_snapshot(self, mount_point: Path | None = None) -> DiskSnapshotOutput:
        if mount_point is None:
            mount_point = self.mount_root

        st = Path(mount_point).stat()
        total_bytes = st.st_blocks * st.st_blksize
        available_bytes = total_bytes - st.st_size

        return DiskSnapshotOutput(
            mount_point=str(mount_point),
            total_bytes=total_bytes,
            available_bytes=available_bytes,
            used_bytes=st.st_size,
        )
