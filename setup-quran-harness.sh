#!/usr/bin/env bash
# ============================================================
#  Quran Harness — Full Developer Setup Script (macOS / Linux)
# ============================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/3] Installing workspace dependencies via pnpm..."
pnpm install

echo "[2/3] Building host and client packages..."
pnpm run build
pnpm --filter @deepseek-ai/dsh-client-ui-quran-theme --filter @deepseek-ai/dsh-client-ui-quran-governance run bundle

echo "[3/3] Setting up Python virtual environment (.venv) for Tajweed and Phonetics..."
if command -v python3 >/dev/null 2>&1; then
  if [ ! -d ".venv" ]; then
    python3 -m venv .venv
  fi
  .venv/bin/pip install --upgrade pip tajweed-embeddings quran-transcript
else
  echo "[Notice] python3 not found on PATH; skipping optional .venv setup for Tajweed/Phonetics."
fi

echo ""
echo "============================================================"
echo " Quran Harness setup complete! Run: ./run-quran-harness.sh"
echo "============================================================"
