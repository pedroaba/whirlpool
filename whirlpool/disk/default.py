from pathlib import Path

homedir = Path.home()

BROWSER_CACHE_DIRS = [
    "Library/Application Support/Google/Chrome/Default/Cache",
    "Library/Application Support/Google/Chrome/Default/Code Cache",
    "Library/Application Support/Google/Chrome/Default/GPUCache",
    "Library/Application Support/Microsoft Edge/Default/Cache",
    "Library/Application Support/Microsoft Edge/Default/Code Cache",
    "Library/Application Support/Microsoft Edge/Default/GPUCache",
]

BROWSER_CACHE_DIRS_PATHS: list[Path] = [homedir / dir for dir in BROWSER_CACHE_DIRS]

USER_CACHE_DIR = homedir / "Library/Caches"
