@echo off
REM Double-click this to test, build and push Cutframe.
REM
REM %~dp0 is the folder this file sits in, so it always runs in the project
REM no matter where the terminal started — which is the whole point of it.
cd /d "%~dp0"

echo.
echo ============================================
echo   1 of 3  Running tests
echo ============================================
call npm test
if errorlevel 1 goto failed

echo.
echo ============================================
echo   2 of 3  Building
echo ============================================
call npm run build
if errorlevel 1 goto failed

echo.
echo ============================================
echo   3 of 3  Pushing
echo ============================================
git add -A
if errorlevel 1 goto failed

set "MSG="
set /p MSG="Describe the change (or press Enter): "
if "%MSG%"=="" set "MSG=Update"

git commit -m "%MSG%"
if errorlevel 1 echo    (nothing new to commit - pushing anyway)

git push
if errorlevel 1 goto failed

echo.
echo  Pushed. Vercel is building now - check it goes green.
echo.
pause
exit /b 0

:failed
echo.
echo  STOPPED - something above failed, so NOTHING was pushed.
echo  Copy the red text and send it to Claude.
echo.
pause
exit /b 1
