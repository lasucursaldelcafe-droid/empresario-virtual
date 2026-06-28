#!/usr/bin/env python3
"""
Obtiene y guarda tokens automáticamente (Turso + secrets locales).

Uso:
  py -3 scripts/get_tokens.py
  py -3 scripts/get_tokens.py --platform-token tso_...
  py -3 scripts/get_tokens.py --non-interactive --platform-token tso_...
"""

from __future__ import annotations

import argparse
import secrets
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from turso_client import (  # noqa: E402
    DEFAULT_DB_NAME,
    DEFAULT_TURSO_ORG,
    TursoApiError,
    fetch_turso_credentials,
    resolve_org_slug,
    resolve_platform_token,
)

ENV_LOCAL = ROOT / ".env.local"


def log(msg: str, *, level: str = "info") -> None:
    prefix = {"info": ">", "ok": "+", "warn": "!", "err": "x"}.get(level, ">")
    print(f"{prefix} {msg}")


def parse_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    env: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip()
    return env


def serialize_env_file(existing_lines: list[str], env: dict[str, str]) -> str:
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


def write_env_updates(updates: dict[str, str], *, dry_run: bool) -> None:
    merged = parse_env_file(ENV_LOCAL)
    merged.update(updates)

    if dry_run:
        for key, value in updates.items():
            if "TOKEN" in key or "SECRET" in key or "KEY" in key:
                display = f"{value[:8]}..." if value else ""
            else:
                display = value
            log(f"[dry-run] .env.local {key}={display}")
        return

    existing_lines: list[str] = []
    if ENV_LOCAL.exists():
        existing_lines = ENV_LOCAL.read_text(encoding="utf-8").splitlines(keepends=True)
    elif (ROOT / ".env.example").exists():
        ENV_LOCAL.write_text((ROOT / ".env.example").read_text(encoding="utf-8"), encoding="utf-8")
        existing_lines = ENV_LOCAL.read_text(encoding="utf-8").splitlines(keepends=True)

    ENV_LOCAL.write_text(serialize_env_file(existing_lines, merged), encoding="utf-8")
    log(f"Actualizado {ENV_LOCAL.relative_to(ROOT)}", level="ok")


def ensure_local_secrets(env: dict[str, str], *, dry_run: bool) -> dict[str, str]:
    updates: dict[str, str] = {}
    if not env.get("ENCRYPTION_KEY"):
        updates["ENCRYPTION_KEY"] = secrets.token_hex(32)
        log("Generando ENCRYPTION_KEY")
    if not env.get("SETUP_SECRET"):
        updates["SETUP_SECRET"] = secrets.token_hex(24)
        log("Generando SETUP_SECRET")
    if updates:
        write_env_updates(updates, dry_run=dry_run)
        env.update(updates)
    return env


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Obtiene tokens Turso y secrets locales para Empresario Virtual",
    )
    parser.add_argument("--platform-token", help="TURSO_PLATFORM_TOKEN (API Turso)")
    parser.add_argument("--turso-org", help=f"Slug org Turso (default: {DEFAULT_TURSO_ORG})")
    parser.add_argument("--db-name", default=DEFAULT_DB_NAME, help="Nombre BD Turso")
    parser.add_argument(
        "--no-create-db",
        action="store_true",
        help="No crear BD si no existe (solo error)",
    )
    parser.add_argument(
        "--non-interactive",
        action="store_true",
        help="No abrir navegador ni pedir token por stdin",
    )
    parser.add_argument("--dry-run", action="store_true", help="Simular sin escribir archivos")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    env = parse_env_file(ENV_LOCAL)
    env = ensure_local_secrets(env, dry_run=args.dry_run)

    if args.dry_run:
        platform_token = args.platform_token or env.get("TURSO_PLATFORM_TOKEN") or "dry-run-platform"
        org_slug = args.turso_org or env.get("TURSO_ORG") or DEFAULT_TURSO_ORG
        log(f"[dry-run] Turso org={org_slug} db={args.db_name}")
        write_env_updates(
            {
                "TURSO_DATABASE_URL": "libsql://example.turso.io",
                "TURSO_AUTH_TOKEN": "dry-run-jwt",
                "TURSO_ORG": org_slug,
                "TURSO_PLATFORM_TOKEN": platform_token,
            },
            dry_run=True,
        )
        log("Listo (dry-run).", level="ok")
        return 0

    platform_token = resolve_platform_token(
        env,
        args.platform_token,
        prompt=not args.non_interactive,
        open_browser=not args.non_interactive,
    )
    org_slug = resolve_org_slug(env, args.turso_org, platform_token)

    log(f"Turso: org={org_slug} db={args.db_name}")
    try:
        creds = fetch_turso_credentials(
            platform_token=platform_token,
            org_slug=org_slug,
            db_name=args.db_name,
            create_if_missing=not args.no_create_db,
        )
    except TursoApiError as exc:
        log(str(exc), level="err")
        return 1

    write_env_updates(creds, dry_run=False)
    log("TURSO_DATABASE_URL obtenida de la API", level="ok")
    log("TURSO_AUTH_TOKEN creado automáticamente", level="ok")
    log("TURSO_PLATFORM_TOKEN guardado para próximas ejecuciones", level="ok")
    print()
    print("Siguiente paso: npm run deploy:auto")
    print("  (sube env vars a Vercel y despliega)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nCancelado.")
        raise SystemExit(130) from None
