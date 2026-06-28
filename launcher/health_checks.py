"""Comprobaciones de salud: Vercel (HTTP) y Turso (libsql HTTP API)."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import urllib.error
import urllib.request
from dataclasses import dataclass

from launcher.env_utils import get_production_url, parse_env_file
from launcher.sync_vercel import turso_token_on_vercel


@dataclass
class CheckResult:
    ok: bool
    label: str
    detail: str


def libsql_to_https(url: str) -> str:
    if url.startswith("libsql://"):
        return "https://" + url.removeprefix("libsql://").rstrip("/")
    if url.startswith("https://"):
        return url.rstrip("/")
    return url.rstrip("/")


def check_vercel_health(base_url: str | None = None, timeout: int = 15) -> CheckResult:
    url = (base_url or get_production_url()).rstrip("/") + "/api/health"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            ok = resp.status == 200
            return CheckResult(ok, "Vercel /api/health", f"{resp.status} — {body[:120]}")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        return CheckResult(False, "Vercel /api/health", f"HTTP {exc.code}: {detail[:120]}")
    except urllib.error.URLError as exc:
        return CheckResult(False, "Vercel /api/health", str(exc.reason or exc))


def check_turso_connection(
    database_url: str | None = None,
    auth_token: str | None = None,
    timeout: int = 20,
) -> CheckResult:
    env = parse_env_file()
    db_url = (database_url or env.get("TURSO_DATABASE_URL", "")).strip()
    token = (auth_token or env.get("TURSO_AUTH_TOKEN", "")).strip()

    if not db_url:
        return CheckResult(False, "Turso", "TURSO_DATABASE_URL no configurada")
    if not token:
        return CheckResult(False, "Turso", "TURSO_AUTH_TOKEN no configurado")

    http_base = libsql_to_https(db_url)
    pipeline_url = f"{http_base}/v2/pipeline"
    payload = json.dumps(
        {"requests": [{"type": "execute", "stmt": {"sql": "SELECT 1 AS ok"}}]}
    ).encode("utf-8")

    try:
        req = urllib.request.Request(
            pipeline_url,
            data=payload,
            method="POST",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            ok = resp.status == 200 and "ok" in body.lower()
            return CheckResult(
                ok,
                "Turso DB",
                f"{resp.status} — conexión OK" if ok else body[:120],
            )
    except urllib.error.HTTPError as exc:
        if exc.code == 401:
            return CheckResult(False, "Turso DB", "Token inválido o expirado (401)")
        detail = exc.read().decode("utf-8", errors="replace")
        return CheckResult(False, "Turso DB", f"HTTP {exc.code}: {detail[:120]}")
    except urllib.error.URLError as exc:
        return CheckResult(False, "Turso DB", str(exc.reason or exc))


def check_google_oauth_env(env: dict[str, str] | None = None) -> CheckResult:
    data = env or parse_env_file()
    missing = [
        key
        for key in ("MAIN_EMAIL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI")
        if not data.get(key, "").strip()
    ]
    if missing:
        return CheckResult(
            False,
            "Google OAuth",
            f"Faltan en .env.local: {', '.join(missing)}",
        )
    return CheckResult(True, "Google OAuth", "Credenciales OAuth presentes en .env.local")


def check_vercel_has_turso_token() -> CheckResult:
    env = parse_env_file()
    base = get_production_url(env)
    return [
        check_vercel_health(base),
        check_turso_connection(
            env.get("TURSO_DATABASE_URL"),
            env.get("TURSO_AUTH_TOKEN"),
        ),
        check_vercel_has_turso_token(),
        check_google_oauth_env(),
    ]
