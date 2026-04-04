type FileSize = int | float

FILESIZE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
BYTESIZE: int = 1024


class Formatter:
    @staticmethod
    def format_filesize(size: FileSize) -> str:
        if not isinstance(size, int) and size < 0:
            return "0 B"

        unit_index = 0
        while size >= BYTESIZE and unit_index < len(FILESIZE_UNITS) - 1:
            size /= BYTESIZE
            unit_index += 1

        return f"{size:.2f} {FILESIZE_UNITS[unit_index]}"
