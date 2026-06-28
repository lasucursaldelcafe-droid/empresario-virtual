param(
  [string]$ProjectRoot = "$PSScriptRoot\.."
)

Set-Location $ProjectRoot

function Get-EnvValue([string]$Name) {
  $content = Get-Content ".env.local" -Raw
  if ($content -match "(?m)^$Name=(.*)$") {
    return $matches[1].Trim().Trim('"')
  }
  return $null
}

$vars = @(
  "TURSO_DATABASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "MAIN_EMAIL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "ENCRYPTION_KEY",
  "SETUP_SECRET"
)

$envs = @("production", "preview", "development")
$added = 0

foreach ($envName in $envs) {
  foreach ($key in $vars) {
    $value = Get-EnvValue $key
    if ([string]::IsNullOrWhiteSpace($value)) {
      Write-Host "SKIP $key ($envName): empty"
      continue
    }
    $value | npx vercel env add $key $envName --force 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $added++ }
  }
}

$token = Get-EnvValue "TURSO_AUTH_TOKEN"
if ([string]::IsNullOrWhiteSpace($token)) {
  Write-Host "TURSO_AUTH_TOKEN missing in .env.local"
} else {
  foreach ($envName in $envs) {
    $token | npx vercel env add TURSO_AUTH_TOKEN $envName --force 2>&1 | Out-Null
  }
  Write-Host "TURSO_AUTH_TOKEN added to Vercel"
}

Write-Host "Configured $added env entries"
npx vercel env ls 2>&1
