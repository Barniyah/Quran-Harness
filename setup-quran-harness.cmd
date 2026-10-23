@echo off
rem ============================================================
rem  Quran Harness — Full Developer Setup Script (Windows)
rem  1. Installs Node.js workspace dependencies (pnpm install)
rem  2. Builds all Host & Client packages + Quran UI bundles
rem  3. Creates Python .venv and installs tajweed-embeddings + quran-transcript
rem ============================================================
cd /d "%~dp0"
if exist "C:\Program Files\nodejs" (
  set "PATH=C:\Program Files\nodejs;%PATH%"
)

echo [1/3] Installing workspace dependencies via pnpm...
call pnpm install --frozen-lockfile
if errorlevel 1 exit /b 1

echo [2/3] Building host and client packages...
rem build:artifacts emits the same runtime artifacts as "pnpm run build" but skips the
rem two test-only aggregate typecheck gates (run "pnpm run build:check" to verify those).
call pnpm run build:artifacts
if errorlevel 1 exit /b 1
call pnpm --filter @deepseek-ai/dsh-client-ui-quran-theme --filter @deepseek-ai/dsh-client-ui-quran-governance run bundle
if errorlevel 1 exit /b 1

echo [3/3] Setting up Python virtual environment (.venv) for Tajweed and Phonetics...
where python >nul 2>nul
if %errorlevel% equ 0 (
  if not exist ".venv" (
    python -m venv .venv
  )
  rem Use "python -m pip" so pip can upgrade itself on Windows (pip.exe is file-locked while running)
  call .venv\Scripts\python.exe -m pip install --upgrade pip
  call .venv\Scripts\python.exe -m pip install --upgrade tajweed-embeddings quran-transcript
  if errorlevel 1 exit /b 1
) else (
  echo [Notice] Python not found on PATH; skipping optional .venv setup for Tajweed/Phonetics.
)

echo.
echo ============================================================
echo  Quran Harness setup complete! Run: run-quran-harness.cmd
echo ============================================================
