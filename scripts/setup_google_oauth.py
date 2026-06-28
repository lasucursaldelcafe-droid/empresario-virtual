#!/usr/bin/env python3
"""
Asistente Google Cloud OAuth para Empresario Virtual.

Abre enlaces de consola, valida .env.local y sugiere URIs de redirect.
NO almacena contraseñas ni secretos fuera de .env.local (gitignored).

Uso:
  py -3 scripts/setup_google_oauth.py
  py -3 scripts/setup_google_oauth.py --open-only
  py -3 scripts/setup_google_oauth.py --validate-only
"""

from __future__ import annotations

import argparse
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from launcher.env_utils import (  # noqa: E402
    DEFAULT_PRODUCTION_URL,
    ensure_env_local,
    get_production_url,
    parse_env_file,
    update_env_keys,
)

PROJECT_ID = "empresario-virtual"
DEFAULT_MAIN_EMAIL = "lasucursaldelcafe@gmail.com"

CONSOLE_LINKS: list[tuple[str, str]] = [
    ("Dashboard del proyecto", f"https://console.cloud.google.com/home/dashboard?project={PROJECT_ID}"),
    ("Biblioteca de APIs", f"https://console.cloud.google.com/apis/library?project={PROJECT_ID}"),
    (
        "Pantalla de consentimiento OAuth",
        f"https://console.cloud.google.com/apis/credentials/consent?project={PROJECT_ID}",
    ),
    (
        "Credenciales OAuth",
        f"https://console.cloud.google.com/apis/credentials?project={PROJECT_ID}",
    ),
    ("Firebase Console", f"https://console.firebase.google.com/project/{PROJECT_ID}"),
]


def log(msg: str, *, level: str = "info") -> None:
    prefix = {"info": ">", "ok": "+", "warn": "!", "err": "x"}.get(level, ">")
    print(f"{prefix} {msg}")


def local_redirect_uri() -> str:
    return "http://localhost:3000/api/oauth/google/callback"


def production_redirect_uri(base: str) -> str:
    return f"{base.rstrip('/')}/api/oauth/google/callback"


def open_console_links() -> None:
    log("Abriendo enlaces de Google Cloud / Firebase...")
    for label, url in CONSOLE_LINKS:
        log(f"  {label}")
        webbrowser.open(url)


def validate_env(env: dict[str, str]) -> list[str]:
    issues: list[str] = []
    base = get_production_url(env)

    main_email = env.get("MAIN_EMAIL", "").strip()
    if not main_email:
        issues.append("MAIN_EMAIL vacío en .env.local")
    elif "@" not in main_email:
        issues.append("MAIN_EMAIL no parece un email válido")

    for key in ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"):
        if not env.get(key, "").strip():
            issues.append(f"{key} vacío - créalo en Google Cloud Console > Credenciales OAuth")

    redirect = env.get("GOOGLE_REDIRECT_URI", "").strip()
    expected_prod = production_redirect_uri(base)
    if redirect and redirect not in {local_redirect_uri(), expected_prod}:
        issues.append(
            f"GOOGLE_REDIRECT_URI distinto de local/producción esperados: {expected_prod}"
        )
    elif not redirect:
        issues.append("GOOGLE_REDIRECT_URI vacío")

    return issues


def ensure_defaults(*, dry_run: bool) -> dict[str, str]:
    ensure_env_local()
    env = parse_env_file()
    updates: dict[str, str] = {}

    if not env.get("MAIN_EMAIL", "").strip():
        updates["MAIN_EMAIL"] = DEFAULT_MAIN_EMAIL
        log(f"Estableciendo MAIN_EMAIL={DEFAULT_MAIN_EMAIL}")

    base = env.get("NEXT_PUBLIC_APP_URL", "").strip() or DEFAULT_PRODUCTION_URL
    if not env.get("NEXT_PUBLIC_APP_URL", "").strip():
        updates["NEXT_PUBLIC_APP_URL"] = base

    expected_redirect = production_redirect_uri(base)
    if not env.get("GOOGLE_REDIRECT_URI", "").strip():
        updates["GOOGLE_REDIRECT_URI"] = local_redirect_uri()
        log(f"Estableciendo GOOGLE_REDIRECT_URI={local_redirect_uri()} (dev)")

    if updates and not dry_run:
        update_env_keys(updates)
        env.update(updates)

    return env


def print_checklist(base: str) -> None:
    print()
    log("Checklist OAuth (copia en Google Cloud Console):", level="ok")
    print(f"  Proyecto: {PROJECT_ID}")
    print(f"  Email principal: {DEFAULT_MAIN_EMAIL}")
    print("  URIs de redirect autorizados:")
    print(f"    - {local_redirect_uri()}")
    print(f"    - {production_redirect_uri(base)}")
    print("  Scopes: gmail.send, gmail.readonly, drive.file, userinfo.email")
    print()
    log("Tras crear credenciales, pega GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local")
    log("Luego: npm run launcher > Sync Vercel env")
    print()
    log(
        "IMPORTANTE: OAuth es la vía correcta. No uses contraseña de Gmail en .env.",
        level="warn",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Setup Google Cloud OAuth")
    parser.add_argument("--open-only", action="store_true", help="Solo abrir consola")
    parser.add_argument("--validate-only", action="store_true", help="Solo validar .env.local")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    env = ensure_defaults(dry_run=args.dry_run)
    base = get_production_url(env)

    if not args.validate_only:
        open_console_links()

    if args.open_only:
        print_checklist(base)
        return 0

    issues = validate_env(parse_env_file() if not args.dry_run else env)
    if issues:
        log("Validación .env.local:", level="warn")
        for item in issues:
            print(f"  - {item}")
    else:
        log("Variables OAuth presentes en .env.local", level="ok")

    print_checklist(base)
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
