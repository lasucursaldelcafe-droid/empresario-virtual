#!/usr/bin/env python3
"""
Automatiza la conexión Turso + Vercel y el despliegue a producción.

Uso:
  python scripts/auto_deploy.py
  python scripts/auto_deploy.py --dry-run
  python scripts/auto_deploy.py --token eyJ... --skip-deploy
"""

from __future__ import annotations

import argparse
import json
import re
import secrets
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Iterable

sys.path.insert(0, str(Path(__file__).resolve().parent))
from turso_client import (  # noqa: E402
    DEFAULT_DB_NAME,
    DEFAULT_TURSO_ORG,
    DEFAULT_TURSO_URL,
    TursoApiError,
    fetch_turso_credentials,
    resolve_org_slug,
    resolve_platform_token,
)

ROOT = Path(__file__).resolve().parent.parent
ENV_LOCAL = ROOT / ".env.local"
# Variables mínimas para producción (Turso + seguridad)
CORE_ENV_KEYS = (
    "TURSO_DATABASE_URL",
    "TURSO_AUTH_TOKEN",
    "ENCRYPTION_KEY",
    "SETUP_SECRET",
)

# Opcionales: se suben a Vercel si existen en .env.local
OPTIONAL_ENV_KEYS = (
    "MAIN_EMAIL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "NEXT_PUBLIC_APP_URL",
    "OPENAI_API_KEY",
    "APPROVAL_THRESHOLD",
    "NODE_ENV",
)

VERCEL_ENV_TARGETS = ("production", "preview", "development")


def log(msg: str, *, level: str = "info") -> None:
    prefix = {"info": ">", "ok": "+", "warn": "!", "err": "x"}.get(level, ">")
    print(f"{prefix} {msg}")


def resolve_vercel_cmd() -> list[str]:
    if shutil.which("vercel"):
        return ["vercel"]
    return ["npx", "vercel"]


def resolve_turso_cmd() -> list[str] | None:
    turso = shutil.which("turso")
    if turso:
        return [turso]
    return None


def run_cmd(
    args: list[str],
    *,
    input_text: str | None = None,
    dry_run: bool = False,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    display = " ".join(args)
    if input_text is not None:
        display += "  (stdin)"
    if dry_run:
        log(f"[dry-run] {display}", level="info")
        return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

    result = subprocess.run(
        args,
        input=input_text,
        text=True,
        capture_output=True,
        cwd=ROOT,
    )
    if check and result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(f"Comando falló ({result.returncode}): {display}\n{detail}")
    return result


def parse_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}

    env: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip()
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


def write_env_updates(updates: dict[str, str], *, dry_run: bool) -> None:
    existing_lines: list[str] = []
    if ENV_LOCAL.exists():
        existing_lines = ENV_LOCAL.read_text(encoding="utf-8").splitlines(keepends=True)

    merged = parse_env_file(ENV_LOCAL) if ENV_LOCAL.exists() else {}
    merged.update(updates)

    if dry_run:
        for key, value in updates.items():
            masked = value if key != "TURSO_AUTH_TOKEN" else f"{value[:8]}..." if value else ""
            log(f"[dry-run] .env.local {key}={masked}", level="info")
        return

    if not ENV_LOCAL.exists():
        example = ROOT / ".env.example"
        if example.exists():
            ENV_LOCAL.write_text(example.read_text(encoding="utf-8"), encoding="utf-8")
            existing_lines = ENV_LOCAL.read_text(encoding="utf-8").splitlines(keepends=True)

    ENV_LOCAL.write_text(
        serialize_env_file(existing_lines, merged),
        encoding="utf-8",
    )
    log(f"Actualizado {ENV_LOCAL.relative_to(ROOT)}")


def generate_hex(byte_len: int) -> str:
    return secrets.token_hex(byte_len)


def ensure_secrets(env: dict[str, str], *, dry_run: bool) -> dict[str, str]:
    updates: dict[str, str] = {}

    if not env.get("ENCRYPTION_KEY"):
        updates["ENCRYPTION_KEY"] = generate_hex(32)
        log("Generando ENCRYPTION_KEY (64 hex chars)")

    if not env.get("SETUP_SECRET"):
        updates["SETUP_SECRET"] = generate_hex(24)
        log("Generando SETUP_SECRET")

    if updates:
        write_env_updates(updates, dry_run=dry_run)
        env.update(updates)

    return env


def resolve_turso_credentials(
    env: dict[str, str],
    turso_url: str,
    token_arg: str | None,
    platform_token_arg: str | None,
    org_arg: str | None,
    db_name: str,
    *,
    dry_run: bool,
    non_interactive: bool,
) -> dict[str, str]:
    if dry_run:
        return {
            "TURSO_DATABASE_URL": turso_url,
            "TURSO_AUTH_TOKEN": token_arg or env.get("TURSO_AUTH_TOKEN") or "dry-run-token",
        }

    if token_arg:
        return {"TURSO_DATABASE_URL": turso_url, "TURSO_AUTH_TOKEN": token_arg.strip()}

    existing_token = env.get("TURSO_AUTH_TOKEN", "").strip()
    existing_url = env.get("TURSO_DATABASE_URL", "").strip() or turso_url
    if existing_token:
        log("Usando TURSO_AUTH_TOKEN existente en .env.local")
        return {"TURSO_DATABASE_URL": existing_url, "TURSO_AUTH_TOKEN": existing_token}

    platform_token: str | None = None
    try:
        platform_token = resolve_platform_token(
            env,
            platform_token_arg,
            prompt=False,
            open_browser=False,
        )
    except SystemExit:
        platform_token = None

    if not platform_token and not non_interactive:
        log("Obteniendo TURSO_PLATFORM_TOKEN (una sola vez)...")
        platform_token = resolve_platform_token(
            env,
            platform_token_arg,
            prompt=True,
            open_browser=True,
        )

    if platform_token:
        org_slug = resolve_org_slug(env, org_arg, platform_token)
        try:
            creds = fetch_turso_credentials(
                platform_token=platform_token,
                org_slug=org_slug,
                db_name=db_name,
            )
            log("Turso: URL + auth token vía Platform API", level="ok")
            return creds
        except TursoApiError as exc:
            log(str(exc), level="warn")

    created = create_turso_token_cli(db_name, dry_run=False)
    if created:
        return {"TURSO_DATABASE_URL": turso_url, "TURSO_AUTH_TOKEN": created}

    if non_interactive:
        raise SystemExit(
            "TURSO_AUTH_TOKEN requerido. Opciones:\n"
            "  1) py -3 scripts/get_tokens.py\n"
            "  2) py -3 scripts/auto_deploy.py --platform-token tso_...\n"
            "  3) py -3 scripts/auto_deploy.py --token <jwt>"
        )

    log("Pega TURSO_AUTH_TOKEN (Dashboard → Database → Create Token):", level="warn")
    pasted = input("TURSO_AUTH_TOKEN: ").strip()
    if not pasted:
        raise SystemExit("TURSO_AUTH_TOKEN requerido para continuar.")
    return {"TURSO_DATABASE_URL": turso_url, "TURSO_AUTH_TOKEN": pasted}


def create_turso_token_cli(db_name: str, *, dry_run: bool) -> str | None:
    turso_cmd = resolve_turso_cmd()
    if not turso_cmd:
        log(
            "CLI 'turso' no disponible (sin binario Windows en releases recientes). "
            "Usa TURSO_PLATFORM_TOKEN o scripts/get_tokens.py",
            level="warn",
        )
        return None

    if dry_run:
        log(f"[dry-run] turso db tokens create {db_name}", level="info")
        return "dry-run-token"

    result = run_cmd([*turso_cmd, "db", "tokens", "create", db_name], check=False)
    output = (result.stdout or result.stderr or "").strip()
    if result.returncode != 0:
        log(f"No se pudo crear token Turso (CLI): {output}", level="warn")
        return None

    token = output.splitlines()[-1].strip()
    if token.startswith("eyJ") or len(token) > 20:
        log("Token Turso creado vía CLI")
        return token

    log(f"Respuesta inesperada de turso: {output}", level="warn")
    return None


def vercel_available() -> bool:
    return shutil.which("vercel") is not None or shutil.which("npx") is not None


def vercel_env_exists(name: str, target: str, *, dry_run: bool) -> bool:
    if dry_run:
        return False
    result = run_cmd([*resolve_vercel_cmd(), "env", "ls", target], check=False)
    output = result.stdout or ""
    return re.search(rf"^\s*{re.escape(name)}\s", output, re.MULTILINE) is not None


def vercel_env_set(name: str, value: str, targets: Iterable[str], *, dry_run: bool) -> None:
    for target in targets:
        if vercel_env_exists(name, target, dry_run=dry_run):
            if dry_run:
                log(f"[dry-run] vercel env rm {name} {target} -y", level="info")
            else:
                run_cmd([*resolve_vercel_cmd(), "env", "rm", name, target, "-y"], check=False)
        run_cmd(
            [*resolve_vercel_cmd(), "env", "add", name, target],
            input_text=value + "\n",
            dry_run=dry_run,
        )
        log(f"Vercel env {name} -> {target}")


def push_env_to_vercel(env: dict[str, str], *, dry_run: bool) -> None:
    if not vercel_available() and not dry_run:
        raise SystemExit(
            "CLI 'vercel' no encontrada. Instala: npm i -g vercel && vercel login "
            "(o usa npx vercel tras npm install)"
        )
    if not vercel_available():
        log("CLI 'vercel' no encontrada (dry-run continua)", level="warn")

    keys = [k for k in CORE_ENV_KEYS if env.get(k)]
    keys.extend(k for k in OPTIONAL_ENV_KEYS if env.get(k))

    log(f"Subiendo {len(keys)} variables a Vercel...")
    for key in keys:
        value = env[key]
        if not value:
            continue
        vercel_env_set(key, value, VERCEL_ENV_TARGETS, dry_run=dry_run)


def deploy_production(*, dry_run: bool) -> str:
    if dry_run:
        log("[dry-run] vercel deploy --prod --yes", level="info")
        return "https://empresario-virtual.vercel.app"

    result = run_cmd([*resolve_vercel_cmd(), "deploy", "--prod", "--yes"])
    output = (result.stdout or "") + (result.stderr or "")
    urls = re.findall(r"https://[^\s\]]+\.vercel\.app", output)
    if urls:
        url = urls[-1].rstrip("/")
        log(f"Deploy OK: {url}", level="ok")
        return url

    inspect = run_cmd([*resolve_vercel_cmd(), "inspect", "--prod"], check=False)
    inspect_out = inspect.stdout or inspect.stderr or ""
    urls = re.findall(r"https://[^\s\]]+\.vercel\.app", inspect_out)
    if urls:
        return urls[0].rstrip("/")

    raise RuntimeError("Deploy completado pero no se detectó URL de producción.")


def http_get(url: str, timeout: int = 60) -> tuple[int, str]:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", errors="replace")
        return resp.status, body


def http_post_json(url: str, payload: dict, timeout: int = 120) -> tuple[int, str]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8", errors="replace")
        return resp.status, body


def verify_deployment(base_url: str, setup_secret: str, *, dry_run: bool) -> None:
    base = base_url.rstrip("/")

    if dry_run:
        log(f"[dry-run] GET {base}/api/health", level="info")
        log(f"[dry-run] GET {base}/api/setup?secret=***", level="info")
        log(f"[dry-run] GET {base}/api/daily-close", level="info")
        return

    log("Verificando /api/health...")
    try:
        status, body = http_get(f"{base}/api/health")
        log(f"health -> {status}: {body[:120]}", level="ok" if status == 200 else "warn")
    except urllib.error.URLError as exc:
        log(f"health falló: {exc}", level="err")

    log("Inicializando BD vía /api/setup...")
    try:
        status, body = http_get(f"{base}/api/setup?secret={setup_secret}", timeout=120)
        log(f"setup -> {status}: {body[:200]}", level="ok" if status == 200 else "warn")
    except urllib.error.URLError as exc:
        log(f"setup falló: {exc}", level="err")

    log("Verificando /api/daily-close (GET info)...")
    try:
        status, body = http_get(f"{base}/api/daily-close")
        log(f"daily-close -> {status}: {body[:120]}", level="ok" if status == 200 else "warn")
    except urllib.error.URLError as exc:
        log(f"daily-close falló: {exc}", level="err")


def sync_public_urls(env: dict[str, str], production_url: str, *, dry_run: bool) -> dict[str, str]:
    updates: dict[str, str] = {}
    base = production_url.rstrip("/")

    if env.get("NEXT_PUBLIC_APP_URL") != base:
        updates["NEXT_PUBLIC_APP_URL"] = base

    redirect = f"{base}/api/oauth/google/callback"
    if env.get("GOOGLE_REDIRECT_URI") != redirect:
        updates["GOOGLE_REDIRECT_URI"] = redirect

    if updates:
        write_env_updates(updates, dry_run=dry_run)
        env.update(updates)
        push_env_to_vercel(
            {k: env[k] for k in ("NEXT_PUBLIC_APP_URL", "GOOGLE_REDIRECT_URI") if env.get(k)},
            dry_run=dry_run,
        )

    return env


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Automatiza Turso + Vercel para Empresario Virtual",
    )
    parser.add_argument(
        "--turso-url",
        default=DEFAULT_TURSO_URL,
        help=f"URL libsql de Turso (default: {DEFAULT_TURSO_URL})",
    )
    parser.add_argument(
        "--token",
        help="TURSO_AUTH_TOKEN (evita prompt/CLI/API turso)",
    )
    parser.add_argument(
        "--platform-token",
        help="TURSO_PLATFORM_TOKEN para crear TURSO_AUTH_TOKEN vía Platform API",
    )
    parser.add_argument(
        "--turso-org",
        default=DEFAULT_TURSO_ORG,
        help=f"Slug de organización Turso (default: {DEFAULT_TURSO_ORG})",
    )
    parser.add_argument(
        "--db-name",
        default=DEFAULT_DB_NAME,
        help=f"Nombre BD Turso (default: {DEFAULT_DB_NAME})",
    )
    parser.add_argument(
        "--non-interactive",
        action="store_true",
        help="No pedir token por stdin si falta (falla con mensaje claro)",
    )
    parser.add_argument(
        "--skip-deploy",
        action="store_true",
        help="Solo .env.local + variables Vercel, sin deploy",
    )
    parser.add_argument(
        "--skip-verify",
        action="store_true",
        help="No llamar endpoints setup/health tras deploy",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Muestra acciones sin ejecutar cambios",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()

    print()
    log("Empresario Virtual — auto deploy Turso + Vercel", level="info")
    print()

    env = parse_env_file(ENV_LOCAL)
    env = ensure_secrets(env, dry_run=args.dry_run)

    turso_creds = resolve_turso_credentials(
        env,
        args.turso_url,
        args.token,
        args.platform_token,
        args.turso_org,
        args.db_name,
        dry_run=args.dry_run,
        non_interactive=args.non_interactive,
    )
    write_env_updates(turso_creds, dry_run=args.dry_run)
    env.update(turso_creds)

    env = parse_env_file(ENV_LOCAL) if not args.dry_run else env
    if args.dry_run:
        env.setdefault("ENCRYPTION_KEY", "dry-run-key")
        env.setdefault("SETUP_SECRET", "dry-run-secret")
        env.update(turso_creds)

    push_env_to_vercel(env, dry_run=args.dry_run)

    production_url = env.get("NEXT_PUBLIC_APP_URL", "").rstrip("/")
    if not args.skip_deploy:
        production_url = deploy_production(dry_run=args.dry_run)
        env = sync_public_urls(env, production_url, dry_run=args.dry_run)
    elif production_url:
        log(f"Deploy omitido. URL conocida: {production_url}")
    else:
        production_url = "https://empresario-virtual.vercel.app"
        log(f"Deploy omitido. Usa URL por defecto: {production_url}", level="warn")

    setup_secret = env.get("SETUP_SECRET", "")
    if not args.skip_verify and setup_secret:
        verify_deployment(production_url, setup_secret, dry_run=args.dry_run)

    print()
    log("Listo.", level="ok")
    print(f"  Producción: {production_url}")
    print(f"  Setup:      {production_url}/api/setup?secret=<SETUP_SECRET>")
    print(f"  Health:     {production_url}/api/health")
    print()
    print("Secrets en .env.local (no commitear). SETUP_SECRET también en Vercel.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nCancelado.")
        raise SystemExit(130) from None
