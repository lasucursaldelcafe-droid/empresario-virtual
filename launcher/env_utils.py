"""Utilidades para leer y escribir .env.local sin exponer secretos."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent.parent
ENV_LOCAL = ROOT / ".env.local"
ENV_EXAMPLE = ROOT / ".env.example"

DEFAULT_TURSO_URL = (
    "libsql://empresario-virtual-empresario-virtual.aws-us-east-2.turso.io"
)
DEFAULT_PRODUCTION_URL = "https://empresario-virtual.vercel.app"


def parse_env_file(path: Path | None = None) -> dict[str, str]:
    target = path or ENV_LOCAL
    if not target.exists():
        return {}

    env: dict[str, str] = {}
    for raw_line in target.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip().strip('"')
    return env


def serialize_env_file(existing_lines: Iterable[str], env: dict[str, str]) -> str:
    seen: set[str] = set()
    out: list[str] = []

    for raw_line in existing_lines:
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            out.append(raw_line.rstrip("\n"))
            continue

        key, _, _ = stripped.partition("=")
        key = key.strip()
        if key in env:
            out.append(f"{key}={env[key]}")
            seen.add(key)
        else:
            out.append(raw_line.rstrip("\n"))

    for key, value in env.items():
        if key not in seen:
            out.append(f"{key}={value}")

    return "\n".join(out).rstrip() + "\n"


def ensure_env_local() -> None:
    if ENV_LOCAL.exists():
        return
    if ENV_EXAMPLE.exists():
        ENV_LOCAL.write_text(ENV_EXAMPLE.read_text(encoding="utf-8"), encoding="utf-8")


def update_env_keys(updates: dict[str, str]) -> None:
    ensure_env_local()
    existing_lines = ENV_LOCAL.read_text(encoding="utf-8").splitlines(keepends=True)
    merged = parse_env_file(ENV_LOCAL)
    merged.update({k: v for k, v in updates.items() if v is not None})
    ENV_LOCAL.write_text(
        serialize_env_file(existing_lines, merged),
        encoding="utf-8",
    )


def get_production_url(env: dict[str, str] | None = None) -> str:
    data = env or parse_env_file()
    return (data.get("NEXT_PUBLIC_APP_URL") or DEFAULT_PRODUCTION_URL).rstrip("/")


def mask_secret(value: str, visible: int = 8) -> str:
    if not value:
        return "(vacío)"
    if len(value) <= visible:
        return "***"
    return f"{value[:visible]}..."
