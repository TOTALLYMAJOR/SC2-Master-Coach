@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "VENV=.venv-desktop"
if not exist "%VENV%\Scripts\python.exe" (
  py -3 -m venv "%VENV%"
)

call "%VENV%\Scripts\activate.bat"
python -m pip install -r requirements-desktop.txt
if errorlevel 1 (
  pause
  exit /b 1
)

python desktop_app.py
