"""
Sincroniza variables de .env.local hacia Vercel (multiplataforma).

Equivalente cross-platform de scripts/sync-vercel-env.ps1
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from launcher.env_utils import ENV_LOCAL, parse_env_file  # noqa: E402

SYNC_KEYS = (
    "TURSO_DATABASE_URL",
    "TURSO_AUTH_TOKEN",
    "NEXT_PUBLIC_APP_URL",
    "GOOGLE_REDIRECT_URI",
    "ENCRYPTION_KEY",
    "SETUP_SECRET",
    "MAIN_EMAIL",
)

VERCEL_TARGETS = ("production", "preview", "development")


def resolve_vercel_cmd() -> list[str]:
    if shutil.which("vercel"):
        return ["vercel"]
    return ["npx", "vercel"]


def run_cmd(args: list[str], *, input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        input=input_text,
        text=True,
        capture_output=True,
        cwd=ROOT,
    )


def vercel_env_exists(name: str, target: str) -> bool:
    result = run_cmd([*resolve_vercel_cmd(), "env", "ls", target])
    output = result.stdout or ""
    return re.search(rf"^\s*{re.escape(name)}\s", output, re.MULTILINE) is not None


def vercel_env_set(name: str, value: str, target: str) -> tuple[bool, str]:
    if vercel_env_exists(name, target):
        run_cmd([*resolve_vercel_cmd(), "env", "rm", name, target, "-y"])

    result = run_cmd(
        [*resolve_vercel_cmd(), "env", "add", name, target],
        input_text=value + "\n",
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        return False, detail
    return True, f"{name} -> {target}"


def sync_to_vercel(
    *,
    keys: tuple[str, ...] = SYNC_KEYS,
    targets: tuple[str, ...] = VERCEL_TARGETS,
    dry_run: bool = False,
) -> list[str]:
    if not ENV_LOCAL.exists():
        raise FileNotFoundError(f"No existe {ENV_LOCAL.relative_to(ROOT)}")

    env = parse_env_file(ENV_LOCAL)
    logs: list[str] = []
    added = 0

    for target in targets:
        for key in keys:
            value = env.get(key, "").strip()
            if not value:
                logs.append(f"SKIP {key} ({target}): vacío en .env.local")
                continue

            if dry_run:
                logs.append(f"[dry-run] vercel env add {key} {target}")
                added += 1
                continue

            ok, message = vercel_env_set(key, value, target)
            if ok:
                logs.append(f"OK {message}")
                added += 1
            else:
                logs.append(f"ERR {key} ({target}): {message}")

    logs.append(f"Total entradas configuradas: {added}")
    return logs


def turso_token_on_vercel() -> bool:
    result = run_cmd([*resolve_vercel_cmd(), "env", "ls", "production"])
    output = result.stdout or ""
    return re.search(r"^\s*TURSO_AUTH_TOKEN\s", output, re.MULTILINE) is not None


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync .env.local -> Vercel")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    try:
        for line in sync_to_vercel(dry_run=args.dry_run):
            print(line)
    except FileNotFoundError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if not args.dry_run:
        result = run_cmd([*resolve_vercel_cmd(), "env", "ls"])
        print((result.stdout or result.stderr or "").strip())

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
