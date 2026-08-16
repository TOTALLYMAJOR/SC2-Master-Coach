$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$venv = Join-Path $PSScriptRoot ".venv-desktop"

if (-not (Test-Path (Join-Path $venv "Scripts\python.exe"))) {
    py -3 -m venv $venv
}

& (Join-Path $venv "Scripts\python.exe") -m pip install -r requirements-desktop.txt
& (Join-Path $venv "Scripts\python.exe") desktop_app.py
