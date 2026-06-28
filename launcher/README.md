# Empresario Virtual — Launcher de escritorio

Aplicación GUI con **Python + tkinter** (stdlib, sin dependencias extra) para operar el proyecto sin terminal.

## Requisitos

- **Python 3.10+** (Windows: `py -3` o `python`)
- **Node.js / npm** (para dev, deploy y sync Vercel)
- Sesión Vercel: `npx vercel login` (una vez)
- Firebase (opcional): login vía `npm run setup:firebase`

## Cómo ejecutar

Desde la raíz del proyecto:

```bash
python launcher/main.py
```

o:

```bash
npm run launcher
```

## Qué hace

| Acción | Descripción |
|--------|-------------|
| **Deploy completo** | `scripts/auto_deploy.py` (Turso + Vercel + verify) |
| **Sync Vercel env** | Sube `.env.local` → Vercel |
| **Configurar Google OAuth** | Abre Google Cloud Console + valida `.env.local` |
| **Setup Firebase** | Login Firebase + valida `firebase.json` |
| **Deploy Firebase rules** | Publica `firestore.rules` (deny-all) |
| **Init DB** | `npm run db:init` |
| **Start web dev** | `npm run dev` |
| **Start mobile** | Expo en `mobile/` |
| **Guardar .env.local** | Turso, MAIN_EMAIL, Google OAuth |

## Panel de estado

- **Vercel health** — `/api/health`
- **Turso DB** — `SELECT 1`
- **Token en Vercel** — `TURSO_AUTH_TOKEN` en production
- **Google OAuth** — `GOOGLE_CLIENT_ID`, `SECRET`, `MAIN_EMAIL` en `.env.local`

## Scripts npm relacionados

```bash
npm run setup:google-oauth   # Google Cloud OAuth
npm run setup:firebase       # Firebase CLI (login + config)
npm run deploy:firebase      # Desplegar reglas Firestore
```

Guía completa: `scripts/setup-google-cloud.md`

## Seguridad

- Secretos solo en `.env.local` (gitignored).
- OAuth es la vía de producción para Gmail — no uses contraseña en `.env`.
- Si expusiste tu contraseña de Gmail, cámbiala en Google Account.
