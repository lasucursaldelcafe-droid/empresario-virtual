#!/usr/bin/env python3
"""
Empresario Virtual — Launcher de escritorio (tkinter, stdlib).

Uso:
  python launcher/main.py
  npm run launcher
"""

from __future__ import annotations

import queue
import shutil
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path
from tkinter import END, BOTH, LEFT, RIGHT, X, Y, Button, Entry, Frame, Label, StringVar, Text, Tk, ttk
from tkinter import scrolledtext
from tkinter import messagebox

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from launcher.env_utils import (  # noqa: E402
    DEFAULT_TURSO_URL,
    ensure_env_local,
    get_production_url,
    mask_secret,
    parse_env_file,
    update_env_keys,
)
from launcher.health_checks import (  # noqa: E402
    check_google_oauth_env,
    check_turso_connection,
    check_vercel_has_turso_token,
    check_vercel_health,
)
from launcher.sync_vercel import sync_to_vercel  # noqa: E402


def resolve_python() -> list[str]:
    if sys.platform == "win32":
        for cmd in (["py", "-3"], ["py"], ["python"], ["python3"]):
            exe = cmd[0]
            if shutil.which(exe):
                return cmd
    else:
        for cmd in (["python3"], ["python"]):
            if shutil.which(cmd[0]):
                return cmd
    return [sys.executable]


def resolve_npm() -> str:
    return "npm.cmd" if sys.platform == "win32" and shutil.which("npm.cmd") else "npm"


class LauncherApp:
    STATUS_OK = "#16a34a"
    STATUS_WARN = "#ca8a04"
    STATUS_ERR = "#dc2626"
    STATUS_IDLE = "#64748b"

    def __init__(self) -> None:
        self.root = Tk()
        self.root.title("Empresario Virtual — Launcher")
        self.root.geometry("980x720")
        self.root.minsize(860, 620)

        self.log_queue: queue.Queue[tuple[str, str | None]] = queue.Queue()
        self.running = False

        env = parse_env_file()
        ensure_env_local()
        env = parse_env_file()

        self.var_turso_url = StringVar(value=env.get("TURSO_DATABASE_URL", DEFAULT_TURSO_URL))
        self.var_turso_token = StringVar(value=env.get("TURSO_AUTH_TOKEN", ""))
        self.var_main_email = StringVar(value=env.get("MAIN_EMAIL", ""))
        self.var_google_client_id = StringVar(value=env.get("GOOGLE_CLIENT_ID", ""))
        self.var_google_client_secret = StringVar(value=env.get("GOOGLE_CLIENT_SECRET", ""))

        self.status_vercel = StringVar(value="Sin comprobar")
        self.status_turso = StringVar(value="Sin comprobar")
        self.status_vercel_env = StringVar(value="Sin comprobar")
        self.status_google_oauth = StringVar(value="Sin comprobar")

        self._build_ui()
        self._load_env_into_form()
        self.root.after(200, self._poll_log_queue)
        self.root.after(800, self.refresh_status)

    def _build_ui(self) -> None:
        header = Frame(self.root, padx=12, pady=10)
        header.pack(fill=X)
        self.header_frame = header
        Label(
            header,
            text="Empresario Virtual",
            font=("Segoe UI", 16, "bold"),
        ).pack(side=LEFT)
        Label(
            header,
            text="Operaciones sin terminal",
            font=("Segoe UI", 10),
            fg="#64748b",
        ).pack(side=LEFT, padx=(12, 0))

        guide = Frame(self.root, padx=12, pady=4, bg="#fef3c7")
        guide.pack(fill=X)
        self.guide_label = Label(
            guide,
            text="",
            bg="#fef3c7",
            fg="#92400e",
            font=("Segoe UI", 9),
            wraplength=900,
            justify=LEFT,
        )
        self.guide_label.pack(fill=X)
        self.guide_frame = guide
        guide.pack_forget()

        env_frame = ttk.LabelFrame(self.root, text="Variables locales (.env.local)", padding=10)
        env_frame.pack(fill=X, padx=12, pady=6)

        self._row(env_frame, "TURSO_DATABASE_URL", self.var_turso_url, show=None)
        self._row(env_frame, "TURSO_AUTH_TOKEN", self.var_turso_token, show="*")
        self._row(env_frame, "MAIN_EMAIL", self.var_main_email, show=None)
        self._row(env_frame, "GOOGLE_CLIENT_ID", self.var_google_client_id, show=None)
        self._row(env_frame, "GOOGLE_CLIENT_SECRET", self.var_google_client_secret, show="*")

        btn_row = Frame(env_frame)
        btn_row.pack(fill=X, pady=(8, 0))
        Button(btn_row, text="Guardar .env.local", command=self.save_env).pack(side=LEFT)
        Button(
            btn_row,
            text="Flujo Turso → Vercel → Deploy",
            command=self.run_turso_guided_flow,
            bg="#2563eb",
            fg="white",
        ).pack(side=LEFT, padx=8)

        body = Frame(self.root)
        body.pack(fill=BOTH, expand=True, padx=12, pady=6)

        left = ttk.LabelFrame(body, text="Acciones", padding=10)
        left.pack(side=LEFT, fill=Y, padx=(0, 8))

        actions = [
            ("Deploy completo", self.run_full_deploy),
            ("Sync Vercel env", self.run_sync_vercel),
            ("Init DB (npm run db:init)", self.run_db_init),
            ("Start web dev", self.run_web_dev),
            ("Start mobile (Expo)", self.run_mobile),
        ]
        for label, cmd in actions:
            Button(left, text=label, width=28, command=cmd).pack(fill=X, pady=3)

        ttk.Separator(left, orient="horizontal").pack(fill=X, pady=8)
        Label(left, text="Google / Firebase", font=("Segoe UI", 9, "bold")).pack(anchor="w")

        google_actions = [
            ("Configurar Google OAuth", self.run_setup_google_oauth),
            ("Setup Firebase", self.run_setup_firebase),
            ("Deploy Firebase rules", self.run_deploy_firebase),
        ]
        for label, cmd in google_actions:
            Button(left, text=label, width=28, command=cmd).pack(fill=X, pady=2)

        ttk.Separator(left, orient="horizontal").pack(fill=X, pady=8)
        Label(left, text="Abrir URLs", font=("Segoe UI", 9, "bold")).pack(anchor="w")

        urls = [
            ("Producción", "/"),
            ("Dashboard", "/dashboard"),
            ("Health API", "/api/health"),
            ("Setup API", "/api/setup"),
        ]
        for label, path in urls:
            Button(
                left,
                text=label,
                width=28,
                command=lambda p=path: self.open_url(p),
            ).pack(fill=X, pady=2)

        right = Frame(body)
        right.pack(side=RIGHT, fill=BOTH, expand=True)

        status_frame = ttk.LabelFrame(right, text="Estado", padding=8)
        status_frame.pack(fill=X, pady=(0, 8))
        self.lbl_vercel = self._status_row(status_frame, "Vercel health", self.status_vercel)
        self.lbl_turso = self._status_row(status_frame, "Turso DB", self.status_turso)
        self.lbl_vercel_env = self._status_row(status_frame, "Token en Vercel", self.status_vercel_env)
        self.lbl_google_oauth = self._status_row(status_frame, "Google OAuth", self.status_google_oauth)
        Button(status_frame, text="Actualizar estado", command=self.refresh_status).pack(anchor="e", pady=(6, 0))

        log_frame = ttk.LabelFrame(right, text="Log", padding=8)
        log_frame.pack(fill=BOTH, expand=True)
        self.log_text = scrolledtext.ScrolledText(log_frame, height=20, font=("Consolas", 9))
        self.log_text.pack(fill=BOTH, expand=True)
        Button(log_frame, text="Limpiar log", command=self.clear_log).pack(anchor="e", pady=(6, 0))

    def _row(
        self,
        parent: Frame,
        label: str,
        variable: StringVar,
        *,
        show: str | None,
    ) -> None:
        row = Frame(parent)
        row.pack(fill=X, pady=3)
        Label(row, text=label, width=22, anchor="w").pack(side=LEFT)
        Entry(row, textvariable=variable, show=show).pack(side=LEFT, fill=X, expand=True)

    def _status_row(self, parent: Frame, title: str, variable: StringVar) -> Label:
        row = Frame(parent)
        row.pack(fill=X, pady=2)
        Label(row, text=title, width=16, anchor="w").pack(side=LEFT)
        lbl = Label(row, textvariable=variable, anchor="w", fg=self.STATUS_IDLE)
        lbl.pack(side=LEFT, fill=X, expand=True)
        return lbl

    def _load_env_into_form(self) -> None:
        env = parse_env_file()
        self.var_turso_url.set(env.get("TURSO_DATABASE_URL", DEFAULT_TURSO_URL))
        self.var_turso_token.set(env.get("TURSO_AUTH_TOKEN", ""))
        self.var_main_email.set(env.get("MAIN_EMAIL", ""))
        self.var_google_client_id.set(env.get("GOOGLE_CLIENT_ID", ""))
        self.var_google_client_secret.set(env.get("GOOGLE_CLIENT_SECRET", ""))

    def log(self, message: str) -> None:
        self.log_queue.put(("log", message))

    def _poll_log_queue(self) -> None:
        while True:
            try:
                kind, payload = self.log_queue.get_nowait()
            except queue.Empty:
                break
            if kind == "log" and payload:
                self.log_text.insert(END, payload + "\n")
                self.log_text.see(END)
            elif kind == "status":
                self._apply_status(payload or {})
            elif kind == "guide":
                self._show_guide(payload or "")
            elif kind == "done":
                self.running = False

        self.root.after(200, self._poll_log_queue)

    def clear_log(self) -> None:
        self.log_text.delete("1.0", END)

    def _apply_status(self, data: dict) -> None:
        mapping = {
            "vercel": (self.status_vercel, self.lbl_vercel),
            "turso": (self.status_turso, self.lbl_turso),
            "vercel_env": (self.status_vercel_env, self.lbl_vercel_env),
            "google_oauth": (self.status_google_oauth, self.lbl_google_oauth),
        }
        for key, (var, lbl) in mapping.items():
            item = data.get(key)
            if not item:
                continue
            var.set(item["detail"])
            lbl.configure(fg=self.STATUS_OK if item["ok"] else self.STATUS_ERR)

        vercel_env = data.get("vercel_env", {})
        if vercel_env and not vercel_env.get("ok"):
            self._show_guide(
                "Falta TURSO_AUTH_TOKEN en Vercel. Usa «Guardar .env.local» → "
                "«Sync Vercel env» → «Deploy completo», o el botón azul de flujo guiado."
            )
        elif vercel_env.get("ok"):
            self.guide_frame.pack_forget()

    def _show_guide(self, text: str) -> None:
        if text:
            self.guide_label.configure(text=text)
            self.guide_frame.pack(fill=X, after=self.header_frame)
        else:
            self.guide_frame.pack_forget()

    def save_env(self) -> None:
        updates = {
            "TURSO_DATABASE_URL": self.var_turso_url.get().strip(),
            "TURSO_AUTH_TOKEN": self.var_turso_token.get().strip(),
            "MAIN_EMAIL": self.var_main_email.get().strip(),
            "GOOGLE_CLIENT_ID": self.var_google_client_id.get().strip(),
            "GOOGLE_CLIENT_SECRET": self.var_google_client_secret.get().strip(),
        }
        update_env_keys(updates)
        self.log("Guardado .env.local")
        self.log(f"  TURSO_AUTH_TOKEN: {mask_secret(updates['TURSO_AUTH_TOKEN'])}")
        self.log(f"  GOOGLE_CLIENT_SECRET: {mask_secret(updates['GOOGLE_CLIENT_SECRET'])}")
        messagebox.showinfo("Guardado", "Variables guardadas en .env.local")
        self.refresh_status()

    def open_url(self, path: str) -> None:
        base = get_production_url()
        url = base if path == "/" else f"{base}{path}"
        if path == "/api/setup":
            env = parse_env_file()
            secret = env.get("SETUP_SECRET", "")
            if secret:
                url = f"{base}/api/setup?secret={secret}"
            else:
                messagebox.showwarning(
                    "Setup",
                    "SETUP_SECRET no está en .env.local. Ejecuta Deploy completo o npm run setup.",
                )
        self.log(f"Abriendo {url}")
        webbrowser.open(url)

    def _guard_busy(self) -> bool:
        if self.running:
            messagebox.showwarning("Ocupado", "Hay una operación en curso.")
            return True
        return False

    def _run_async(self, title: str, worker) -> None:
        if self._guard_busy():
            return
        self.running = True
        self.log(f"--- {title} ---")

        def target() -> None:
            try:
                worker()
            except Exception as exc:  # noqa: BLE001
                self.log(f"ERROR: {exc}")
            finally:
                self.log_queue.put(("done", None))

        threading.Thread(target=target, daemon=True).start()

    def _stream_process(self, args: list[str], *, cwd: Path | None = None) -> int:
        self.log(f"$ {' '.join(args)}")
        proc = subprocess.Popen(
            args,
            cwd=cwd or ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            shell=False,
        )
        assert proc.stdout is not None
        for line in proc.stdout:
            self.log(line.rstrip())
        proc.wait()
        self.log(f"Exit code: {proc.returncode}")
        return proc.returncode or 0

    def run_full_deploy(self) -> None:
        def worker() -> None:
            py = resolve_python()
            code = self._stream_process([*py, "scripts/auto_deploy.py", "--non-interactive"])
            if code != 0:
                self.log("Deploy falló. Revisa token Turso y sesión Vercel (vercel login).")
            self.log_queue.put(("status", self._collect_status()))
        self._run_async("Deploy completo", worker)

    def run_sync_vercel(self) -> None:
        def worker() -> None:
            for line in sync_to_vercel():
                self.log(line)
            self.log_queue.put(("status", self._collect_status()))
        self._run_async("Sync Vercel env", worker)

    def run_db_init(self) -> None:
        def worker() -> None:
            self._stream_process([resolve_npm(), "run", "db:init"])
        self._run_async("Init DB", worker)

    def run_web_dev(self) -> None:
        def worker() -> None:
            self.log("Servidor Next.js en http://localhost:3000 (Ctrl+C en terminal si lo lanzaste aparte)")
            self._stream_process([resolve_npm(), "run", "dev"])
        self._run_async("Web dev", worker)

    def run_mobile(self) -> None:
        def worker() -> None:
            mobile_dir = ROOT / "mobile"
            if not mobile_dir.exists():
                self.log("ERROR: carpeta mobile/ no encontrada")
                return
            self._stream_process([resolve_npm(), "start"], cwd=mobile_dir)
        self._run_async("Mobile Expo", worker)

    def run_setup_google_oauth(self) -> None:
        def worker() -> None:
            py = resolve_python()
            self._stream_process([*py, "scripts/setup_google_oauth.py"])
            self._load_env_into_form()
            self.log_queue.put(("status", self._collect_status()))
        self._run_async("Configurar Google OAuth", worker)

    def run_setup_firebase(self) -> None:
        def worker() -> None:
            py = resolve_python()
            self._stream_process([*py, "scripts/setup_firebase.py"])
        self._run_async("Setup Firebase", worker)

    def run_deploy_firebase(self) -> None:
        def worker() -> None:
            py = resolve_python()
            self._stream_process([*py, "scripts/setup_firebase.py", "--deploy-rules"])
        self._run_async("Deploy Firebase rules", worker)

    def run_turso_guided_flow(self) -> None:
        if not self.var_turso_token.get().strip():
            messagebox.showerror(
                "Token requerido",
                "Pega TURSO_AUTH_TOKEN en el formulario y pulsa Guardar primero.",
            )
            return

        if not messagebox.askyesno(
            "Flujo guiado",
            "1) Guardar .env.local\n2) Sync Vercel env\n3) Deploy producción\n\n¿Continuar?",
        ):
            return

        def worker() -> None:
            self.log("Paso 1/3: guardando .env.local")
            update_env_keys(
                {
                    "TURSO_DATABASE_URL": self.var_turso_url.get().strip(),
                    "TURSO_AUTH_TOKEN": self.var_turso_token.get().strip(),
                    "MAIN_EMAIL": self.var_main_email.get().strip(),
                    "GOOGLE_CLIENT_ID": self.var_google_client_id.get().strip(),
                    "GOOGLE_CLIENT_SECRET": self.var_google_client_secret.get().strip(),
                }
            )
            self.log("Paso 2/3: sync Vercel")
            for line in sync_to_vercel():
                self.log(line)
            self.log("Paso 3/3: deploy producción")
            py = resolve_python()
            code = self._stream_process([*py, "scripts/auto_deploy.py", "--non-interactive"])
            if code == 0:
                self.log("Flujo completado.")
                self.log_queue.put(("guide", ""))
            else:
                self.log("Deploy falló en el paso 3.")
            self.log_queue.put(("status", self._collect_status()))

        self._run_async("Flujo Turso → Vercel → Deploy", worker)

    def _collect_status(self) -> dict:
        base = get_production_url()
        env = parse_env_file()
        vercel = check_vercel_health(base)
        turso = check_turso_connection(
            env.get("TURSO_DATABASE_URL"),
            env.get("TURSO_AUTH_TOKEN"),
        )
        vercel_env = check_vercel_has_turso_token()
        google_oauth = check_google_oauth_env(env)
        return {
            "vercel": {"ok": vercel.ok, "detail": vercel.detail},
            "turso": {"ok": turso.ok, "detail": turso.detail},
            "vercel_env": {"ok": vercel_env.ok, "detail": vercel_env.detail},
            "google_oauth": {"ok": google_oauth.ok, "detail": google_oauth.detail},
        }

    def refresh_status(self) -> None:
        def worker() -> None:
            self.log("Comprobando estado...")
            data = self._collect_status()
            self.log_queue.put(("status", data))
            self.log("Estado actualizado.")

        if self.running:
            threading.Thread(target=worker, daemon=True).start()
        else:
            self._run_async("Estado", worker)

    def run(self) -> None:
        self.log("Launcher listo. Proyecto: " + str(ROOT))
        self.log("Producción: " + get_production_url())
        self.root.mainloop()


def main() -> None:
    LauncherApp().run()


if __name__ == "__main__":
    main()
