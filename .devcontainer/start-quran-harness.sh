#!/usr/bin/env bash
# ============================================================
#  Quran Harness — Codespaces launcher
#  Starts the standard ./run-quran-harness.sh with the forwarded
#  Codespaces URL advertised and trusted (port 3080).
# ============================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

PORT="${QURAN_HARNESS_PORT:-3080}"
EXTRA_ARGS=(--port "$PORT" --no-open)

if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  PUBLIC_HOST="${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  EXTRA_ARGS+=(--public-url "https://${PUBLIC_HOST}/" --trusted-host "${PUBLIC_HOST}")
fi

echo "============================================================"
echo " Quran Harness is starting..."
echo " When the URL appears below, Ctrl+Click it to open the Web GUI"
echo " (the URL contains a one-time launch token — do not share it)."
echo " Restart later with: bash .devcontainer/start-quran-harness.sh"
echo "============================================================"
exec bash ./run-quran-harness.sh "${EXTRA_ARGS[@]}" "$@"
