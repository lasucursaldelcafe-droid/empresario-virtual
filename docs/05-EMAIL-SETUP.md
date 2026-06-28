# Configuración de correo — Gmail OAuth

Empresario Virtual se conecta a tu **correo principal** mediante credenciales OAuth dedicadas (no comparte contraseña).

> **Cuenta principal:** `lasucursaldelcafe@gmail.com`  
> **Automatización:** `npm run setup:google-oauth` (abre consola + valida `.env.local`)  
> **Guía extendida:** `scripts/setup-google-cloud.md`

## Paso 0: Asistente automatizado

```bash
npm run setup:google-oauth
```

Abre Google Cloud Console, establece `MAIN_EMAIL` si falta, y lista URIs de redirect para local y Vercel.

## Paso 1: Crear proyecto en Google Cloud Console

1. Ve a https://console.cloud.google.com/
2. Crea proyecto: `empresario-virtual` (o usa el existente)
3. Habilita APIs:
   - Gmail API
   - Google Drive API
   - People API (opcional, para perfil)

## Paso 2: Crear credenciales OAuth 2.0

1. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente OAuth**
2. Tipo: **Aplicación web**
3. Nombre: `Empresario Virtual Local`
4. URIs de redirección autorizados:
   ```
   http://localhost:3000/api/oauth/google/callback
   https://empresario-virtual.vercel.app/api/oauth/google/callback
   ```
5. Descarga el JSON → guárdalo como `secrets/google-oauth-client.json` (NO subir a git)

## Paso 3: Pantalla de consentimiento

1. Tipo: Externo (o Interno si tienes Google Workspace)
2. App name: Empresario Virtual
3. Email de soporte: tu correo principal
4. Scopes: gmail.send, gmail.readonly, drive.file

## Paso 4: Configurar `.env.local`

Copia `.env.example` a `.env.local` y completa:

```env
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth/google/callback
MAIN_EMAIL=lasucursaldelcafe@gmail.com
NEXT_PUBLIC_APP_URL=https://empresario-virtual.vercel.app
ENCRYPTION_KEY=genera-con-openssl-rand-hex-32
OPENAI_API_KEY=sk-...
```

Generar clave de encriptación:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Paso 5: Autorizar la app

1. Inicia el servidor: `npm run dev`
2. Abre http://localhost:3000/settings/integrations
3. Clic en **Conectar Gmail**
4. Inicia sesión con tu correo principal y acepta permisos
5. El refresh token se guarda encriptado en la base de datos

## Sync a Vercel

Tras completar OAuth en `.env.local`:

```bash
python launcher/sync_vercel.py
# o npm run launcher → Sync Vercel env
```

## Alternativa: contraseña de aplicación (solo fallback manual)

**OAuth es la vía de producción.** Solo usa SMTP si **tú mismo** creas una App Password en Google Account → Seguridad (nunca la pegues en chat ni la commitees):

1. Google Account → Seguridad → Verificación en 2 pasos (activar)
2. Contraseñas de aplicaciones → Crear "Empresario Virtual"
3. En `.env.local` (local, gitignored):
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=lasucursaldelcafe@gmail.com
   SMTP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

> OAuth es la opción recomendada (revocable, scopes limitados). Si expusiste tu contraseña de Gmail, cámbiala de inmediato en Google Account.

## Seguridad

- Nunca commitees `.env.local` ni `secrets/`
- Rota credenciales si se comprometen
- Usa cuenta de servicio separada si el volumen de emails es alto
