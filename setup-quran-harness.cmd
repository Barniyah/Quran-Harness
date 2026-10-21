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
call pnpm install
if errorlevel 1 exit /b 1

echo [2/3] Building host and client packages...
call pnpm run build
call pnpm --filter @deepseek-ai/dsh-client-ui-quran-theme --filter @deepseek-ai/dsh-client-ui-quran-governance run bundle
if errorlevel 1 exit /b 1

echo [3/3] Setting up Python virtual environment (.venv) for Tajweed and Phonetics...
where python >nul 2>nul
if %errorlevel% equ 0 (
  if not exist ".venv" (
    python -m venv .venv
  )
  call .venv\Scripts\pip.exe install --upgrade pip tajweed-embeddings quran-transcript
) else (
  echo [Notice] Python not found on PATH; skipping optional .venv setup for Tajweed/Phonetics.
)

echo.
echo ============================================================
echo  Quran Harness setup complete! Run: run-quran-harness.cmd
echo ============================================================
