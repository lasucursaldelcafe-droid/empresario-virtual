# Configuración de correo — Gmail OAuth

Empresario Virtual se conecta a tu **correo principal** mediante credenciales OAuth dedicadas (no comparte contraseña).

## Paso 1: Crear proyecto en Google Cloud Console

1. Ve a https://console.cloud.google.com/
2. Crea proyecto: `empresario-virtual`
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
MAIN_EMAIL=tu-correo@gmail.com
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

## Alternativa: contraseña de aplicación (solo envío SMTP)

Si prefieres no usar OAuth para pruebas rápidas:

1. Google Account → Seguridad → Verificación en 2 pasos (activar)
2. Contraseñas de aplicaciones → Crear "Empresario Virtual"
3. En `.env.local`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu-correo@gmail.com
   SMTP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

> OAuth es la opción recomendada para producción (revocable, scopes limitados).

## Seguridad

- Nunca commitees `.env.local` ni `secrets/`
- Rota credenciales si se comprometen
- Usa cuenta de servicio separada si el volumen de emails es alto
