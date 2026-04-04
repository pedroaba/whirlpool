import subprocess
from sys import platform

OS_NAMES = {
    "darwin": "macOS",
    "linux": "Linux",
    "win32": "Windows",
}


class Platform:
    @staticmethod
    def assert_macos():
        os_name = OS_NAMES.get(platform)
        if os_name is None:
            raise RuntimeError(f"Unknown OS: {platform}")

        if platform != "darwin":
            raise RuntimeError(f"This script must be run on MacOS, not {os_name}")

    @staticmethod
    def get_fulldisk_permissions():
        if platform != "darwin":
            return False

        try:
            result = subprocess.run(
                [
                    "/usr/bin/open",
                    "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension",
                ],
                capture_output=True,
                text=True,
            )

            return "system.preferences" in result.stdout
        except subprocess.CalledProcessError:
            return False
