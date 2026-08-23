from __future__ import annotations

import ipaddress
import socket

import pytest


def _is_local_address(address) -> bool:
    if isinstance(address, str):
        # Unix-domain sockets use filesystem paths and never leave the host.
        return True
    if not isinstance(address, tuple) or not address:
        return True
    host = address[0]
    if isinstance(host, bytes):
        host = host.decode("ascii", errors="ignore")
    host = str(host).strip("[]").lower()
    if host in {"localhost", "127.0.0.1", "::1"}:
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


@pytest.fixture(autouse=True)
def block_external_network(monkeypatch):
    """Fail the test suite when application code opens an external socket."""
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex

    def guarded_connect(sock, address):
        if not _is_local_address(address):
            raise AssertionError(f"External network access is forbidden during tests: {address!r}")
        return original_connect(sock, address)

    def guarded_connect_ex(sock, address):
        if not _is_local_address(address):
            raise AssertionError(f"External network access is forbidden during tests: {address!r}")
        return original_connect_ex(sock, address)

    monkeypatch.setattr(socket.socket, "connect", guarded_connect)
    monkeypatch.setattr(socket.socket, "connect_ex", guarded_connect_ex)
