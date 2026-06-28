# Google Cloud + Firebase — Empresario Virtual

Guía para configurar **Google OAuth (Gmail + Drive)** y **Firebase** (Auth/Firestore opcional) manteniendo **Vercel + Turso** como stack principal.

## Arquitectura híbrida

| Servicio | Rol |
|----------|-----|
| **Vercel** | Hosting Next.js (producción) |
| **Turso** | Base de datos principal (libSQL) |
| **Google Cloud Console** | OAuth 2.0 (Gmail API, Drive API) |
| **Firebase** | Auth/Firestore opcional (sync futuro) |

> OAuth es el camino correcto para `lasucursaldelcafe@gmail.com`. **No uses contraseña de Gmail** en `.env.local`.

## Paso 1 — Variables locales

```bash
cp .env.example .env.local
```

Mínimo para correo:

```env
MAIN_EMAIL=lasucursaldelcafe@gmail.com
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth/google/callback
NEXT_PUBLIC_APP_URL=https://empresario-virtual.vercel.app
```

Automatización:

```bash
npm run setup:google-oauth
# o
py -3 scripts/setup_google_oauth.py
```

El script abre la consola de Google, valida variables y sugiere URIs de redirect.

## Paso 2 — Google Cloud Console (una vez)

1. **Proyecto:** `empresario-virtual`  
   https://console.cloud.google.com/home/dashboard?project=empresario-virtual

2. **Habilitar APIs:**
   - Gmail API
   - Google Drive API  
   https://console.cloud.google.com/apis/library?project=empresario-virtual

3. **Pantalla de consentimiento OAuth:**  
   https://console.cloud.google.com/apis/credentials/consent?project=empresario-virtual  
   - Tipo: Externo  
   - Email de soporte: `lasucursaldelcafe@gmail.com`  
   - Scopes: `gmail.send`, `gmail.readonly`, `drive.file`, `userinfo.email`

4. **Credenciales OAuth → Aplicación web:**  
   https://console.cloud.google.com/apis/credentials?project=empresario-virtual  

   URIs de redirección autorizados:

   ```
   http://localhost:3000/api/oauth/google/callback
   https://empresario-virtual.vercel.app/api/oauth/google/callback
   ```

5. Copia **Client ID** y **Client Secret** a `.env.local` (nunca a git).

6. Descarga el JSON y guárdalo como `secrets/google-oauth-client.json` (gitignored).

## Paso 3 — Firebase (opcional)

Firebase comparte el mismo proyecto de Google Cloud (`empresario-virtual`).

```bash
npm run setup:firebase
# o
py -3 scripts/setup_firebase.py
```

**Login interactivo (una vez):** el script ejecuta `npx -y firebase-tools@latest login` y abre el navegador. Si falla, usa:

```bash
npx -y firebase-tools@latest login --no-localhost
```

Despliegue de reglas Firestore (deny-all por defecto):

```bash
npm run deploy:firebase
```

## Paso 4 — Sync a Vercel

Tras completar `.env.local`:

```bash
npm run launcher          # botón «Sync Vercel env»
# o
python launcher/sync_vercel.py
# o flujo completo
npm run deploy:auto
```

Variables sincronizadas: `MAIN_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, etc.

## Paso 5 — Conectar Gmail en la app

1. `npm run dev`
2. http://localhost:3000/settings/integrations
3. **Conectar con Google** → inicia sesión con `lasucursaldelcafe@gmail.com`

## App Password (solo fallback manual)

Si **tú mismo** creas una contraseña de aplicación en Google Account → Seguridad, puedes usar SMTP como respaldo. **No la pegues en el chat ni la commitees.**

Ver `docs/05-EMAIL-SETUP.md` sección alternativa SMTP.

## Seguridad

- Rota la contraseña de Gmail si se expuso en chat o logs.
- OAuth + refresh token encriptado en DB es la vía de producción.
- Firestore rules actuales **deniegan todo** hasta que decidas migrar datos.

## Referencias

- `docs/05-EMAIL-SETUP.md` — detalle OAuth
- `docs/07-FREE-DEPLOY.md` — deploy gratuito Vercel + Turso
- [Google OAuth best practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
