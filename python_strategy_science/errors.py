from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ScienceError(Exception):
    code: str
    message: str
    http_status: int = 400

    def __str__(self) -> str:
        return self.message

    def to_dict(self) -> dict[str, object]:
        return {
            "ok": False,
            "error": {
                "code": self.code,
                "message": self.message,
            },
        }
