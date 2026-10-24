#!/usr/bin/env bash
# ============================================================
#  Quran Harness — Codespaces one-time setup
#  Runs the standard ./setup-quran-harness.sh inside the container.
# ============================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "[Codespaces] Installing native build tools (node-pty)..."
sudo apt-get update -y >/dev/null
sudo apt-get install -y --no-install-recommends build-essential python3-venv >/dev/null

echo "[Codespaces] Installing pnpm (version pinned by package.json)..."
PNPM_VERSION="$(node -p "require('./package.json').packageManager.split('@')[1]")"
npm install -g "pnpm@${PNPM_VERSION}" >/dev/null

echo "[Codespaces] Running Quran Harness setup..."
bash ./setup-quran-harness.sh

echo "[Codespaces] Setup complete. The Web GUI starts automatically in the terminal."
