"""Cliente Turso Platform API (stdlib). Automatiza URL + auth token de BD."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
import webbrowser
from getpass import getpass
from pathlib import Path
from typing import Any

TURSO_PLATFORM_API = "https://api.turso.tech/v1"
TURSO_TOKEN_URL = "https://turso.tech/app/settings/tokens"
DEFAULT_DB_NAME = "empresario-virtual"
DEFAULT_TURSO_ORG = "empresario-virtual"
DEFAULT_TURSO_URL = (
    "libsql://empresario-virtual-empresario-virtual.aws-us-east-2.turso.io"
)


class TursoApiError(RuntimeError):
    def __init__(self, status: int, detail: str) -> None:
        super().__init__(f"Turso API {status}: {detail[:300]}")
        self.status = status
        self.detail = detail


def turso_request(
    method: str,
    path: str,
    platform_token: str,
    *,
    body: dict[str, Any] | None = None,
    query: str = "",
) -> dict[str, Any]:
    url = f"{TURSO_PLATFORM_API}{path}{query}"
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {platform_token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            if not raw.strip():
                return {}
            return json.loads(raw)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise TursoApiError(exc.code, detail) from exc


def hostname_to_libsql_url(hostname: str) -> str:
    host = hostname.strip().removeprefix("libsql://")
    return f"libsql://{host}"


def list_organizations(platform_token: str) -> list[dict[str, Any]]:
    payload = turso_request("GET", "/organizations", platform_token)
    orgs = payload.get("organizations", [])
    if isinstance(orgs, list):
        return orgs
    return []


def get_database(org_slug: str, db_name: str, platform_token: str) -> dict[str, Any]:
    payload = turso_request(
        "GET",
        f"/organizations/{org_slug}/databases/{db_name}",
        platform_token,
    )
    db = payload.get("database", payload)
    if not isinstance(db, dict):
        raise TursoApiError(500, f"Respuesta inesperada: {payload}")
    return db


def create_database(
    org_slug: str,
    db_name: str,
    platform_token: str,
    *,
    group: str = "default",
) -> dict[str, Any]:
    payload = turso_request(
        "POST",
        f"/organizations/{org_slug}/databases",
        platform_token,
        body={"name": db_name, "group": group},
    )
    db = payload.get("database", payload)
    if not isinstance(db, dict):
        raise TursoApiError(500, f"Respuesta inesperada al crear BD: {payload}")
    return db


def ensure_database(
    org_slug: str,
    db_name: str,
    platform_token: str,
    *,
    create_if_missing: bool = True,
) -> dict[str, Any]:
    try:
        return get_database(org_slug, db_name, platform_token)
    except TursoApiError as exc:
        if exc.status != 404 or not create_if_missing:
            raise
        return create_database(org_slug, db_name, platform_token)


def database_libsql_url(db: dict[str, Any]) -> str:
    hostname = (
        db.get("Hostname")
        or db.get("hostname")
        or db.get("url")
        or ""
    )
    if isinstance(hostname, str) and hostname.strip():
        return hostname_to_libsql_url(hostname)
    name = db.get("Name") or db.get("name") or DEFAULT_DB_NAME
    raise TursoApiError(
        500,
        f"No se encontró hostname en la BD '{name}'. Respuesta: {db}",
    )


def create_db_auth_token(
    org_slug: str,
    db_name: str,
    platform_token: str,
) -> str:
    payload = turso_request(
        "POST",
        f"/organizations/{org_slug}/databases/{db_name}/auth/tokens",
        platform_token,
        body={},
        query="?expiration=never&authorization=full-access",
    )
    jwt = payload.get("jwt", "").strip()
    if not jwt:
        raise TursoApiError(500, f"Token vacío en respuesta: {payload}")
    return jwt


def resolve_platform_token(
    env: dict[str, str],
    platform_token_arg: str | None,
    *,
    prompt: bool = True,
    open_browser: bool = True,
) -> str:
    if platform_token_arg:
        return platform_token_arg.strip()

    for key in ("TURSO_PLATFORM_TOKEN", "TURSO_API_TOKEN"):
        value = env.get(key, "").strip()
        if value:
            return value

    for key in ("TURSO_PLATFORM_TOKEN", "TURSO_API_TOKEN"):
        value = (os.environ.get(key) or "").strip()
        if value:
            return value

    if not prompt:
        raise SystemExit(
            "Falta TURSO_PLATFORM_TOKEN.\n"
            f"  1) Crea uno en {TURSO_TOKEN_URL}\n"
            "  2) Añádelo a .env.local o pasa --platform-token"
        )

    if open_browser:
        print(f"\nAbriendo Turso → Settings → API Tokens:\n  {TURSO_TOKEN_URL}\n")
        try:
            webbrowser.open(TURSO_TOKEN_URL)
        except OSError:
            print(f"  (abre manualmente: {TURSO_TOKEN_URL})")

    token = getpass("Pega TURSO_PLATFORM_TOKEN (input oculto): ").strip()
    if not token:
        raise SystemExit("TURSO_PLATFORM_TOKEN requerido.")
    return token


def resolve_org_slug(
    env: dict[str, str],
    org_arg: str | None,
    platform_token: str,
) -> str:
    if org_arg:
        return org_arg.strip()

    for key in ("TURSO_ORG",):
        value = env.get(key, "").strip() or (os.environ.get(key) or "").strip()
        if value:
            return value

    try:
        orgs = list_organizations(platform_token)
        if len(orgs) == 1:
            slug = orgs[0].get("slug") or orgs[0].get("Slug") or ""
            if slug:
                return str(slug)
        if len(orgs) > 1:
            print("\nOrganizaciones Turso disponibles:")
            for org in orgs:
                slug = org.get("slug") or org.get("Slug") or "?"
                name = org.get("name") or org.get("Name") or slug
                print(f"  - {slug} ({name})")
            chosen = input(f"Slug de org [{DEFAULT_TURSO_ORG}]: ").strip()
            return chosen or DEFAULT_TURSO_ORG
    except TursoApiError:
        pass

    return DEFAULT_TURSO_ORG


def fetch_turso_credentials(
    *,
    platform_token: str,
    org_slug: str,
    db_name: str = DEFAULT_DB_NAME,
    create_if_missing: bool = True,
) -> dict[str, str]:
    db = ensure_database(
        org_slug,
        db_name,
        platform_token,
        create_if_missing=create_if_missing,
    )
    url = database_libsql_url(db)
    auth_token = create_db_auth_token(org_slug, db_name, platform_token)
    return {
        "TURSO_DATABASE_URL": url,
        "TURSO_AUTH_TOKEN": auth_token,
        "TURSO_ORG": org_slug,
        "TURSO_PLATFORM_TOKEN": platform_token,
    }
