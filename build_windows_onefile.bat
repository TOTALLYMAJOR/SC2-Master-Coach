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
  py -3 -m venv "%VENV%"
)

call "%VENV%\Scripts\activate.bat"
python -m pip install --upgrade pip
python -m pip install -r requirements-desktop.txt
if errorlevel 1 (
  pause
  exit /b 1
)

if exist build rmdir /s /q build
if exist "dist\%APPNAME%.exe" del /q "dist\%APPNAME%.exe"
if exist "SC2 Master Coach.spec" del /q "SC2 Master Coach.spec"

echo Building single-file desktop executable...
set "VOICE_DATA="
if exist "voice_models\vosk-model-small-en-us-0.15\am\final.mdl" set "VOICE_DATA=--add-data voice_models/vosk-model-small-en-us-0.15:voice_models/vosk-model-small-en-us-0.15"
python -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --windowed ^
  --onefile ^
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

echo.
echo Single executable created:
echo   %CD%\dist\%APPNAME%.exe
echo.
echo Note: single-file mode extracts its bundled runtime to a temporary
echo directory at launch, so startup can be slower than the portable build.
pause
