@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "VENV=.venv-desktop"
set "APPNAME=SC2 Master Coach"

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher "py" was not found.
  echo Install Python 3.12 or newer, then run this file again.
  pause
  exit /b 1
)

if not exist "%VENV%\Scripts\python.exe" (
  echo [1/5] Creating build environment...
  py -3 -m venv "%VENV%"
)

call "%VENV%\Scripts\activate.bat"
if errorlevel 1 exit /b 1

echo [2/5] Installing desktop dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements-desktop.txt
if errorlevel 1 (
  echo Dependency installation failed.
  pause
  exit /b 1
)

echo [3/5] Cleaning previous builds...
if exist build rmdir /s /q build
if exist "dist\%APPNAME%" rmdir /s /q "dist\%APPNAME%"
if exist "SC2 Master Coach.spec" del /q "SC2 Master Coach.spec"

echo [4/5] Building portable desktop application...
set "VOICE_DATA="
if exist "voice_models\vosk-model-small-en-us-0.15\am\final.mdl" set "VOICE_DATA=--add-data voice_models/vosk-model-small-en-us-0.15:voice_models/vosk-model-small-en-us-0.15"
python -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --windowed ^
  --onedir ^
  --name "%APPNAME%" ^
  --add-data "static:static" ^
  --collect-data python_strategy_science ^
  --collect-all vosk ^
  --collect-all sounddevice ^
  --collect-all sc2reader ^
  --collect-all mpyq ^
  --collect-all webview ^
  --collect-all pysc2 ^
  --collect-all s2clientprotocol ^
  --collect-all s2protocol ^
  --collect-all google.protobuf ^
  --collect-all portpicker ^
  --hidden-import webview.platforms.edgechromium ^
  --hidden-import pysc2.run_configs.platforms ^
  --hidden-import pysc2.lib.features ^
  %VOICE_DATA% ^
  desktop_app.py

if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

if not exist "dist\%APPNAME%\_internal\static\live-checkpoints.js" if not exist "dist\%APPNAME%\static\live-checkpoints.js" (
  echo Packaged Live Coach checkpoint engine was not found.
  exit /b 1
)
if not exist "dist\%APPNAME%\_internal\static\coach-progression.js" if not exist "dist\%APPNAME%\static\coach-progression.js" (
  echo Packaged Live Coach progression engine was not found.
  exit /b 1
)

echo [5/5] Complete.
echo.
echo Portable desktop application:
echo   %CD%\dist\%APPNAME%\%APPNAME%.exe
echo.
echo Copy the entire "%APPNAME%" folder to another Windows 10/11 PC.
echo No Python installation is required on the destination machine.
echo.
pause
