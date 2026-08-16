from __future__ import annotations

import atexit
import socket
import threading
import time
import os
import sys
from pathlib import Path
from contextlib import closing

import webview
from waitress import create_server

from app import app


APP_TITLE = "SC2 Master Coach"
DEFAULT_WIDTH = 1560
DEFAULT_HEIGHT = 980


def storage_directory() -> Path:
    if os.name == "nt":
        base = Path(os.environ.get("APPDATA", Path.home()))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    path = base / "SC2 Master Coach"
    path.mkdir(parents=True, exist_ok=True)
    return path


def find_free_port() -> int:
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


class LocalServer:
    def __init__(self) -> None:
        self.port = find_free_port()
        self.server = create_server(app, host="127.0.0.1", port=self.port, threads=6)
        self.thread = threading.Thread(
            target=self.server.run,
            name="sc2-master-coach-local-server",
            daemon=True,
        )

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.port}"

    def start(self) -> None:
        self.thread.start()

    def stop(self) -> None:
        try:
            self.server.close()
        except Exception:
            pass


def wait_until_ready(host: str, port: int, timeout: float = 8.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.25):
                return True
        except OSError:
            time.sleep(0.05)
    return False


def main() -> None:
    local = LocalServer()
    atexit.register(local.stop)
    local.start()

    if not wait_until_ready("127.0.0.1", local.port):
        raise RuntimeError("SC2 Master Coach local service failed to start.")

    window = webview.create_window(
        APP_TITLE,
        local.url,
        width=DEFAULT_WIDTH,
        height=DEFAULT_HEIGHT,
        min_size=(1050, 700),
        resizable=True,
        fullscreen=False,
        confirm_close=True,
        background_color="#02070b",
    )

    try:
        webview.start(
            debug=False,
            private_mode=False,
            storage_path=str(storage_directory()),
        )
    finally:
        local.stop()


if __name__ == "__main__":
    main()
