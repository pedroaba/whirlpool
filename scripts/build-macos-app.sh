#!/usr/bin/env bash
# Build Whirlpool.app: compiled Bun binary + Info.plist (bundle id com.pedroaba.whirlpool).
# Output: apps/cli/dist/Whirlpool.app (override with APP_OUT)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_OUT="${APP_OUT:-$ROOT/apps/cli/dist/Whirlpool.app}"
TEMPLATE="$ROOT/packaging/macos/Info.plist.template"

cd "$ROOT"
bun install

# Build icon assets (SVG → PNGs → AppIcon.icns) before assembling and signing the app.
bun scripts/build-icons.ts

cd "$ROOT/apps/cli"
bun run build

VERSION="$(grep -m1 '"version"' "$ROOT/apps/cli/package.json" | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')"

rm -rf "$APP_OUT"
mkdir -p "$APP_OUT/Contents/MacOS"
mkdir -p "$APP_OUT/Contents/Resources"

cp -f "$ROOT/apps/cli/dist/whirlpool" "$APP_OUT/Contents/MacOS/whirlpool"
chmod +x "$APP_OUT/Contents/MacOS/whirlpool"

cp -f "$ROOT/packaging/macos/AppIcon.icns" "$APP_OUT/Contents/Resources/AppIcon.icns"

sed "s/__VERSION__/${VERSION}/g" "$TEMPLATE" > "$APP_OUT/Contents/Info.plist"

# Ad-hoc sign so Gatekeeper is less noisy for local builds (optional identity: CODESIGN_IDENTITY).
if command -v codesign >/dev/null 2>&1; then
  SIGN="${CODESIGN_IDENTITY:--}"
  codesign --force --deep --sign "$SIGN" "$APP_OUT" || true
fi

echo "Built: $APP_OUT"
echo "Install: open the folder, drag Whirlpool.app to Applications."
echo "Run (from any folder): open \"$APP_OUT\" --args disk"
echo "After moving to /Applications: open -a Whirlpool --args disk"
echo "PATH (current build): export PATH=\"$APP_OUT/Contents/MacOS:\$PATH\""
