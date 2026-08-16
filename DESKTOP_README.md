# SC2 Master Coach — Standalone Desktop Edition

**Created by MBMapps**

This package wraps the Tactical Doctrine Battle Station + Replay Intelligence Engine as a native desktop application.

## What "standalone" means

After you build the Windows package:

- launch **SC2 Master Coach.exe**
- no browser tab opens
- no terminal window is required
- the internal replay API starts invisibly on `127.0.0.1` using a random free port
- `.SC2Replay` files are analyzed locally
- profiles, XP, cognitive-trap history, and match history persist in the desktop app's storage directory
- the destination PC does **not** need Python installed

The desktop window is provided by `pywebview`; the internal HTTP service uses Flask + Waitress; replay decoding uses `sc2reader`.

## Fastest Windows path

For the most reliable portable desktop build:

```text
build_windows_portable.bat
```

When complete, run:

```text
dist\SC2 Master Coach\SC2 Master Coach.exe
```

Copy the **entire** `dist\SC2 Master Coach` folder to another Windows machine.

## Single EXE

If you specifically want one file:

```text
build_windows_onefile.bat
```

Output:

```text
dist\SC2 Master Coach.exe
```

Single-file mode is convenient, but startup is slower because PyInstaller extracts its bundled support files to a temporary directory when launched.

## Run the desktop shell before packaging

```text
run_desktop_windows.bat
```

This is useful while developing the app. It requires Python on the development machine.

## End-user prerequisites

The built application includes the Python interpreter and Python packages.

On Windows, the native UI uses the installed Microsoft Edge WebView2 runtime. Current Windows 10/11 installations commonly already have it because it is used by Microsoft applications. If the native window cannot initialize, install or repair the Microsoft WebView2 Runtime.

## Persistent application data

Desktop web storage is retained under:

```text
%APPDATA%\SC2 Master Coach
```

This preserves the existing coach's local player model instead of resetting it every time the native window closes.

## Security boundary

The replay service:

- binds only to `127.0.0.1`
- chooses an unused local port at launch
- is not exposed to the LAN or internet
- processes replay uploads locally
- shuts down when the native window exits

## Why there are two Windows build modes

### Portable folder — recommended

Advantages:

- quicker startup
- easier to diagnose
- easier to update individual support files
- fewer antivirus false-positive patterns than self-extracting one-file binaries

### One-file EXE

Advantages:

- simplest artifact to hand someone
- no adjacent runtime folder

Tradeoff:

- PyInstaller must unpack the internal application at startup

## Files added for desktop packaging

```text
desktop_app.py
requirements-desktop.txt
run_desktop_windows.bat
run_desktop.ps1
build_windows_portable.bat
build_windows_onefile.bat
```

The original replay engine remains intact:

```text
app.py
replay_engine.py
static/index.html
tests/
```

## Important build constraint

PyInstaller is not a cross-compiler. Build the Windows `.exe` on Windows. The included `.bat` files are designed for that purpose.

## Recommended release workflow

```text
1. Unzip this project in Windows
2. Run build_windows_portable.bat
3. Launch the generated EXE
4. Load a real .SC2Replay
5. Verify Replay Intel + Battle Station persistence
6. Distribute the output folder
```

Use `build_windows_onefile.bat` only after the portable build has been verified with real replay files.

## Marketing artwork

Use a cinematic key art image showing a lone Terran Ghost tactically outsmarting a massive Zerg swarm with a precision nuclear strike. The emphasis should be on intelligence, restraint, positioning, and asymmetric advantage—not gore.
