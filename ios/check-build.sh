#!/usr/bin/env bash
# Verify the iOS project compiles cleanly (Swift 6 strict concurrency).
# Usage: npm run ios:build
# Requires: Xcode command-line tools (xcodebuild)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Regenerate project from project.yml so the xcodeproj is always in sync
if command -v xcodegen &>/dev/null; then
  echo "Regenerating project from project.yml..."
  xcodegen generate --spec "$SCRIPT_DIR/project.yml" --project "$SCRIPT_DIR"
fi

echo "Building for iOS Simulator (Swift 6 strict concurrency)..."
xcodebuild build \
  -project "$SCRIPT_DIR/TsuriNavi.xcodeproj" \
  -scheme TsuriNavi \
  -destination 'generic/platform=iOS Simulator' \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO \
  -quiet

echo "Build succeeded."
