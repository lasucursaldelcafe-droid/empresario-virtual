# Despliegue 100% gratis — Empresario Virtual

Stack gratuito recomendado:

| Servicio | Plan | Costo | Para qué |
|----------|------|-------|----------|
| **GitHub** | Free | $0 | Código (ya hecho) |
| **Vercel** | Hobby | $0 | Hosting Next.js |
| **Turso** | Free | $0 | Base de datos (5 GB) |
| **Google Cloud** | Free | $0 | OAuth Gmail |
| **Expo Go** | Free | $0 | Probar Android en el teléfono |

> Vercel Hobby es para proyectos personales/no comerciales. Turso free: 100 DBs, 5 GB, sin tarjeta.

---

## Automatización (recomendado)

Script Python que conecta Turso + Vercel, sube variables de entorno, despliega a producción y verifica endpoints:

```powershell
# Requisitos: Python 3.10+ (Windows: py -3), vercel CLI (vercel login), turso CLI opcional
python scripts/auto_deploy.py
# Windows si python no esta en PATH:
py -3 scripts/auto_deploy.py

# O vía npm:
npm run deploy:auto

# Simular sin cambios:
python scripts/auto_deploy.py --dry-run

# Solo env vars (sin deploy):
python scripts/auto_deploy.py --skip-deploy

# Pasar token Turso manualmente:
python scripts/auto_deploy.py --token eyJhbG...
```

**Qué automatiza:** genera `ENCRYPTION_KEY` y `SETUP_SECRET`, actualiza `.env.local`, crea token Turso (si `turso` CLI está logueada), sube env vars a Vercel, `vercel deploy --prod`, llama `/api/setup`, `/api/health` y `/api/daily-close`.

**Manual si falta algo:** token Turso si no tienes `turso auth login`, credenciales Google OAuth, y `vercel login` la primera vez.

---

## Paso 1 — Turso (base de datos, 2 min)

1. Regístrate en https://turso.tech (sin tarjeta)
2. Instala CLI (PowerShell):

```powershell
irm get.tur.so/install.ps1 | iex
```

3. Login y crea la BD:

```powershell
turso auth login
turso db create empresario-virtual --region iad
turso db show empresario-virtual --url
turso db tokens create empresario-virtual
```

Guarda:
- `TURSO_DATABASE_URL` (libsql://...)
- `TURSO_AUTH_TOKEN`

---

## Paso 2 — Vercel (hosting, 3 min)

1. https://vercel.com/signup → **Continue with GitHub**
2. **Add New Project** → importa `lasucursaldelcafe-droid/empresario-virtual`
3. Framework: **Next.js** (auto-detectado)
4. Variables de entorno (Settings → Environment Variables):

| Variable | Valor |
|----------|-------|
| `TURSO_DATABASE_URL` | de Turso |
| `TURSO_AUTH_TOKEN` | de Turso |
| `ENCRYPTION_KEY` | `node scripts/generate-key.js` |
| `SETUP_SECRET` | cualquier string largo aleatorio |
| `MAIN_EMAIL` | tu Gmail |
| `GOOGLE_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://TU-PROYECTO.vercel.app/api/oauth/google/callback` |
| `NEXT_PUBLIC_APP_URL` | `https://TU-PROYECTO.vercel.app` |

5. **Deploy**

---

## Paso 3 — Inicializar datos en producción

Tras el primer deploy exitoso, abre en el navegador:

```
https://TU-PROYECTO.vercel.app/api/setup?secret=TU_SETUP_SECRET
```

Deberías ver: `{"ok":true,"message":"Base de datos inicializada..."}`

---

## Paso 4 — Google OAuth (gratis)

1. https://console.cloud.google.com → proyecto `empresario-virtual`
2. APIs: Gmail API + Google Drive API
3. Credenciales OAuth → redirect de producción:
   ```
   https://TU-PROYECTO.vercel.app/api/oauth/google/callback
   ```
4. En la app: `/settings/integrations` → Conectar Google

---

## Paso 5 — App Android (gratis con Expo Go)

```powershell
cd mobile
copy .env.example .env
# Edita EXPO_PUBLIC_API_URL=https://TU-PROYECTO.vercel.app
npm start
```

Escanea el QR con **Expo Go** (Play Store, gratis).

Para emulador Android Studio: `npm run android`

---

## URLs en producción (ya desplegado)

- **Web:** https://empresario-virtual.vercel.app
- **Dashboard:** https://empresario-virtual.vercel.app/dashboard
- **Health:** https://empresario-virtual.vercel.app/api/health
- **Vercel dashboard:** https://vercel.com/lasucursaldelcafe-droids-projects/empresario-virtual

> Falta conectar Turso (BD) y variables de entorno para que la API funcione.

---

## Límites free tier (cuándo pagar)

- **Vercel**: ~1M invocaciones/mes, uso personal
- **Turso**: 5 GB, 500M lecturas/mes — suficiente para decenas de microempresas demo
- **Expo EAS Build** (APK en la nube): plan free limitado; Expo Go no tiene límite para desarrollo
