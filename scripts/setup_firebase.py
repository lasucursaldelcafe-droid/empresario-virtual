#!/usr/bin/env python3
"""
Setup Firebase para Empresario Virtual (no destructivo).

- Verifica firebase-tools
- Guía login interactivo (navegador, una vez)
- Valida firebase.json / .firebaserc
- Despliega reglas Firestore (deny-all por defecto)

Uso:
  py -3 scripts/setup_firebase.py
  py -3 scripts/setup_firebase.py --deploy-rules
  py -3 scripts/setup_firebase.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIREBASE_JSON = ROOT / "firebase.json"
FIREBASERC = ROOT / ".firebaserc"
FIRESTORE_RULES = ROOT / "firestore.rules"

DEFAULT_PROJECT = "empresario-virtual"
FIREBASE_CLI = ["npx", "-y", "firebase-tools@latest"]


def log(msg: str, *, level: str = "info") -> None:
    prefix = {"info": ">", "ok": "+", "warn": "!", "err": "x"}.get(level, ">")
    print(f"{prefix} {msg}")


def run_cmd(
    args: list[str],
    *,
    dry_run: bool = False,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    display = " ".join(args)
    if dry_run:
        log(f"[dry-run] {display}")
        return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

    result = subprocess.run(args, text=True, capture_output=True, cwd=ROOT)
    if check and result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(f"Comando falló ({display}): {detail}")
    return result


def firebase_available() -> bool:
    return shutil.which("npx") is not None


def check_login(*, dry_run: bool) -> bool:
    result = run_cmd([*FIREBASE_CLI, "login:list"], dry_run=dry_run, check=False)
    output = (result.stdout or result.stderr or "").lower()
    if dry_run:
        return True
    return "no authorized accounts" not in output and result.returncode == 0


def prompt_login(*, dry_run: bool) -> None:
    if dry_run:
        log("[dry-run] firebase login (abre navegador)")
        return

    log("Login Firebase requerido (una vez). Se abrirá el navegador.", level="warn")
    log("Si falla: npx -y firebase-tools@latest login --no-localhost")
    webbrowser.open("https://console.firebase.google.com/")
    result = run_cmd([*FIREBASE_CLI, "login"], check=False)
    if result.returncode != 0:
        raise RuntimeError(
            "Login Firebase falló. Ejecuta manualmente:\n"
            "  npx -y firebase-tools@latest login\n"
            "  npx -y firebase-tools@latest login --no-localhost  (sin navegador local)"
        )
    log("Login Firebase OK", level="ok")


def ensure_config_files(*, dry_run: bool) -> None:
    missing = [p.name for p in (FIREBASE_JSON, FIREBASERC, FIRESTORE_RULES) if not p.exists()]
    if missing:
        raise FileNotFoundError(
            f"Faltan archivos Firebase en el repo: {', '.join(missing)}. "
            "Ejecuta desde la raíz del proyecto clonado."
        )
    log("firebase.json, .firebaserc y firestore.rules presentes", level="ok")

    if dry_run:
        return

    rc = json.loads(FIREBASERC.read_text(encoding="utf-8"))
    project = rc.get("projects", {}).get("default", DEFAULT_PROJECT)
    run_cmd([*FIREBASE_CLI, "use", project], check=False)
    log(f"Proyecto activo: {project}", level="ok")


def deploy_rules(*, dry_run: bool) -> None:
    log("Desplegando reglas Firestore (deny-all)...")
    run_cmd([*FIREBASE_CLI, "deploy", "--only", "firestore:rules", "--non-interactive"], dry_run=dry_run)
    log("Reglas Firestore desplegadas", level="ok")


def print_next_steps() -> None:
    print()
    log("Firebase configurado (modo híbrido):", level="ok")
    print("  - Vercel: hosting Next.js")
    print("  - Turso: base de datos principal")
    print("  - Firebase: Auth/Firestore opcional")
    print()
    log("Comandos útiles:")
    print("  npm run setup:firebase")
    print("  npm run deploy:firebase")
    print("  npm run setup:google-oauth")


def main() -> int:
    parser = argparse.ArgumentParser(description="Setup Firebase (Empresario Virtual)")
    parser.add_argument("--deploy-rules", action="store_true", help="Desplegar firestore.rules")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not firebase_available():
        log("Se requiere Node.js/npx para firebase-tools", level="err")
        return 1

    try:
        ensure_config_files(dry_run=args.dry_run)

        if not check_login(dry_run=args.dry_run):
            prompt_login(dry_run=args.dry_run)

        if args.deploy_rules:
            deploy_rules(dry_run=args.dry_run)
        else:
            log("Config validada. Usa --deploy-rules o npm run deploy:firebase para publicar reglas.")

        print_next_steps()
        return 0
    except (RuntimeError, FileNotFoundError) as exc:
        log(str(exc), level="err")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
