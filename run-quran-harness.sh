#!/usr/bin/env bash
# ============================================================
#  Quran Harness — Portable POSIX (macOS / Linux) Launcher
# ============================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "packages/quran/quran-bundle/lib/index.js" ]; then
  echo "[Quran Harness] Building host and client packages for first run..."
  pnpm run build:lib:host
  pnpm --filter @deepseek-ai/dsh-client-ui-quran-theme --filter @deepseek-ai/dsh-client-ui-quran-governance run bundle
fi

exec node apps/cli/lib/bin.js --profile web --patch "$SCRIPT_DIR/packages/quran/quran-bundle/cordis.patch.yml" "$@"
