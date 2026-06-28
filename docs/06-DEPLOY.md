# Despliegue en línea

## GitHub + Vercel (recomendado)

1. Repo: `https://github.com/lasucursaldelcafe-droid/empresario-virtual`
2. Importa el repo en [Vercel](https://vercel.com/new)
3. Configura variables de entorno (ver abajo)
4. Deploy automático en cada push a `main`

## Base de datos en producción (Turso)

SQLite local **no funciona** en Vercel (serverless). Usa [Turso](https://turso.tech) (gratis):

```bash
# Instalar CLI Turso
curl -sSfL https://get.tur.so/install.sh | bash

turso db create empresario-virtual
turso db tokens create empresario-virtual
```

Variables en Vercel:

| Variable | Descripción |
|----------|-------------|
| `TURSO_DATABASE_URL` | URL libsql de Turso |
| `TURSO_AUTH_TOKEN` | Token de Turso |
| `ENCRYPTION_KEY` | Hex 64 chars (npm run setup) |
| `GOOGLE_CLIENT_ID` | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `GOOGLE_REDIRECT_URI` | `https://TU-DOMINIO.vercel.app/api/oauth/google/callback` |
| `MAIN_EMAIL` | Correo del empresario |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app |

Tras el primer deploy, ejecuta seed en producción:

```bash
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:init
```

## App Android

La app Expo en `mobile/` apunta a tu URL de Vercel:

```env
EXPO_PUBLIC_API_URL=https://empresario-virtual.vercel.app
```

Ver `mobile/README.md` para compilar APK.

## OAuth Google en producción

En Google Cloud Console, añade el redirect de producción:

```
https://tu-proyecto.vercel.app/api/oauth/google/callback
```

Pasa la app a estado **Producción** para evitar expiración de tokens a 7 días.
