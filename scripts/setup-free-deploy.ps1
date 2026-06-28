# Script de ayuda — despliegue gratis Empresario Virtual
# Ejecutar: powershell -ExecutionPolicy Bypass -File scripts/setup-free-deploy.ps1

Write-Host ""
Write-Host "=== Empresario Virtual — Despliegue GRATIS ===" -ForegroundColor Cyan

$encryptionKey = node scripts/generate-key.js
$setupSecret = node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"

Write-Host ""
Write-Host "1. TURSO gratis sin tarjeta: https://turso.tech" -ForegroundColor Yellow
Write-Host "   Crea BD en el dashboard o con CLI:"
Write-Host "   turso db create empresario-virtual --region iad"

Write-Host ""
Write-Host "2. VERCEL gratis: https://vercel.com/new" -ForegroundColor Yellow
Write-Host "   Repo: lasucursaldelcafe-droid/empresario-virtual"
Write-Host "   Variables de entorno:"

Write-Host "   TURSO_DATABASE_URL=libsql://..."
Write-Host "   TURSO_AUTH_TOKEN=..."
Write-Host "   ENCRYPTION_KEY=$encryptionKey"
Write-Host "   SETUP_SECRET=$setupSecret"
Write-Host "   MAIN_EMAIL=tu-correo@gmail.com"
Write-Host "   GOOGLE_REDIRECT_URI=https://TU-PROYECTO.vercel.app/api/oauth/google/callback"
Write-Host "   NEXT_PUBLIC_APP_URL=https://TU-PROYECTO.vercel.app"

Write-Host ""
Write-Host "3. Tras deploy inicializa BD:" -ForegroundColor Yellow
Write-Host "   https://TU-PROYECTO.vercel.app/api/setup?secret=$setupSecret"

Write-Host ""
Write-Host "Guia: docs/07-FREE-DEPLOY.md" -ForegroundColor Green

if (-not (Test-Path ".env.local")) {
  Copy-Item ".env.example" ".env.local"
}

Add-Content -Path ".env.local" -Value "`nENCRYPTION_KEY=$encryptionKey`nSETUP_SECRET=$setupSecret"
Write-Host "Claves anadidas a .env.local" -ForegroundColor Green
