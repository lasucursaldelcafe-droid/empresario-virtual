# Empresario Virtual — Launcher de escritorio

Aplicación GUI con **Python + tkinter** (stdlib, sin dependencias extra) para operar el proyecto sin terminal.

## Requisitos

- **Python 3.10+** (Windows: `py -3` o `python`)
- **Node.js / npm** (para dev, deploy y sync Vercel)
- Sesión Vercel: `npx vercel login` (una vez)

## Cómo ejecutar

Desde la raíz del proyecto:

```bash
python launcher/main.py
```

o:

```bash
npm run launcher
```

En Windows también puedes hacer doble clic si `.py` está asociado a Python, o crear un acceso directo a:

```
py -3 launcher\main.py
```

## Qué hace

| Acción | Descripción |
|--------|-------------|
| **Deploy completo** | Ejecuta `scripts/auto_deploy.py` (Turso + Vercel + verify) |
| **Sync Vercel env** | Sube `.env.local` → Vercel (`launcher/sync_vercel.py`) |
| **Init DB** | `npm run db:init` (SQLite local / Turso según `.env.local`) |
| **Start web dev** | `npm run dev` (Next.js en :3000) |
| **Start mobile** | `cd mobile && npm start` (Expo) |
| **Abrir URLs** | Producción, dashboard, `/api/health`, `/api/setup` |
| **Guardar .env.local** | TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, MAIN_EMAIL |
| **Flujo guiado** | Guardar → Sync Vercel → Deploy (cuando falta token en Vercel) |

## Panel de estado

- **Vercel health**: GET `{NEXT_PUBLIC_APP_URL}/api/health`
- **Turso DB**: prueba HTTP pipeline (`SELECT 1`)
- **Token en Vercel**: comprueba si `TURSO_AUTH_TOKEN` existe en production

Si falta el token en Vercel, aparece un aviso amarillo y el botón azul **Flujo Turso → Vercel → Deploy**.

## Sync cross-platform

`launcher/sync_vercel.py` reemplaza `scripts/sync-vercel-env.ps1` en cualquier SO:

```bash
python launcher/sync_vercel.py
python launcher/sync_vercel.py --dry-run
```

## Seguridad

- Los secretos se guardan solo en `.env.local` (gitignored).
- El log enmascara `TURSO_AUTH_TOKEN` al guardar.
- No commitees `.env.local` ni pegues tokens en el chat.

## Estructura

```
launcher/
  main.py           # GUI tkinter
  sync_vercel.py    # Sync .env.local → Vercel
  health_checks.py  # Health Vercel + Turso
  env_utils.py      # Lectura/escritura .env.local
  README.md
```

## Flujo típico (primera vez)

1. Abrir launcher: `npm run launcher`
2. Pegar **TURSO_AUTH_TOKEN** y **MAIN_EMAIL** → **Guardar .env.local**
3. Pulsar **Flujo Turso → Vercel → Deploy** (o paso a paso)
4. **Actualizar estado** hasta ver verde en los tres indicadores
5. **Abrir URLs** → Dashboard / Health

Después del setup, usa los botones de dev/mobile según necesites.
