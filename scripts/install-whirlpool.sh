#!/usr/bin/env bash
# Build whirlpool with `bun build --compile` and copy the binary into PREFIX (default: ~/.local/bin).
# Docs: https://bun.com/docs/bundler/executables
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PREFIX="${PREFIX:-$HOME/.local/bin}"
BINARY_NAME="${BINARY_NAME:-whirlpool}"

cd "$ROOT"
if [[ ! -f bun.lock ]]; then
  echo "warning: no bun.lock at repo root; running bun install anyway" >&2
fi
bun install

cd "$ROOT/apps/cli"
bun run build

mkdir -p "$PREFIX"
DEST="$PREFIX/$BINARY_NAME"
cp -f dist/whirlpool "$DEST"
chmod +x "$DEST"

echo "Installed: $DEST"
if [[ ":$PATH:" != *":$PREFIX:"* ]]; then
  echo ""
  echo "Add this directory to your PATH, e.g. for zsh:"
  echo "  echo 'export PATH=\"$PREFIX:\$PATH\"' >> ~/.zshrc && source ~/.zshrc"
fi
