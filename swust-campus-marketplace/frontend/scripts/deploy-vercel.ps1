# Deploy frontend to Vercel (Windows PowerShell)
# Run from the frontend/ directory after: npx vercel login
#
# Safe env only — never pass Django/DB/AWS secrets.

param(
  [string]$ApiBaseUrl = "https://api.example.com/api/v1",
  [switch]$Preview
)

$ErrorActionPreference = "Stop"

if (-not $ApiBaseUrl.StartsWith("https://")) {
  throw "ApiBaseUrl must be https:// for production."
}
if ($ApiBaseUrl -match "localhost|127\.0\.0\.1") {
  throw "ApiBaseUrl must not use localhost."
}

Write-Host "Building locally to validate env..."
$env:VITE_API_BASE_URL = $ApiBaseUrl
npm run build

Write-Host "Ensuring Vercel env VITE_API_BASE_URL (production)..."
# Idempotent-ish: remove+add is interactive on some CLI versions; prefer dashboard if this fails.
npx vercel env add VITE_API_BASE_URL production --force 2>$null
# If the CLI prompts, paste: $ApiBaseUrl

if ($Preview) {
  npx vercel --yes
} else {
  npx vercel --prod --yes
}

Write-Host "Done. Confirm HTTPS URL in the Vercel output."
Write-Host "Only VITE_API_BASE_URL should exist in Vercel env vars."
