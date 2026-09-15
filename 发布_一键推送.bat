@echo off
rem ============================================================
rem  MengXing Baby - one-click local publish (git channel)
rem  For big files (assets/) that exceed the 60MB admin-page limit.
rem  Usage: double-click me. Steps: pull --ff-only > add/commit > push > verify
rem ============================================================
setlocal EnableDelayedExpansion
cd /d "%~dp0"
echo ==== [1/4] git pull --ff-only ====
git pull --ff-only origin main
if errorlevel 1 goto fail

echo ==== [2/4] git add + commit ====
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -q -m "publish: local one-click push"
  if errorlevel 1 goto fail
  echo     committed.
) else (
  echo     nothing to commit.
)

echo ==== [3/4] git push ====
git push origin HEAD:main
if errorlevel 1 goto fail

echo ==== [4/4] verify remote hash ====
set HEAD=
for /f %%i in ('git rev-parse HEAD') do set HEAD=%%i
git ls-remote origin refs/heads/main | findstr "!HEAD!" >nul
if errorlevel 1 (
  echo REMOTE MISMATCH - push may have failed silently.
  goto fail
)
echo REMOTE OK: !HEAD!
echo.
echo DONE. GitHub Pages will refresh in 1-3 minutes.
pause
exit /b 0

:fail
echo.
echo FAILED. Read the messages above.
pause
exit /b 1
