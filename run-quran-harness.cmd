@echo off
rem ============================================================
rem  Quran Harness — Portable Windows Launcher
rem  يشغّل الواجهة الرسومية لـ Quran Harness (الأدوات + الـ Preset + المهارات + الثيم + بطاقة الحوكمة)
rem ============================================================
cd /d "%~dp0"
if exist "C:\Program Files\nodejs\node.exe" (
  set "NODE=C:\Program Files\nodejs\node.exe"
) else (
  set "NODE=node"
)

if not exist "packages\quran\quran-bundle\lib\index.js" (
  echo [Quran Harness] Building host and client packages for first run...
  call pnpm run build:lib:host
  call pnpm --filter @deepseek-ai/dsh-client-ui-quran-theme --filter @deepseek-ai/dsh-client-ui-quran-governance run bundle
)

"%NODE%" apps/cli/lib/bin.js --profile web --patch "%~dp0packages\quran\quran-bundle\cordis.patch.yml" %*
