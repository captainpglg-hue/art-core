# ============================================================
# PUSH-FIX-413.ps1 - Commit + push du fix 413 (compression client)
# A lancer APRES que PUSH-NOW.ps1 a deja ete execute
# ============================================================

$ErrorActionPreference = "Continue"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " PUSH-FIX-413 : compression image client-side" -ForegroundColor Cyan
Write-Host "============================================"

Write-Host ""
Write-Host "[1/3] git add..."
git add `
    pass-core/components/certifier/ConfirmStep.tsx `
    photo-module-v2/components/ConfirmStep.tsx `
    PUSH-FIX-413.ps1 2>&1 | Out-String | Write-Host

Write-Host ""
Write-Host "[2/3] git commit..."
git commit -m "fix(certify): compress macro photo client-side to avoid 413 Vercel limit" 2>&1 | Out-String | Write-Host

Write-Host ""
Write-Host "[3/3] git push..."
git push 2>&1 | Out-String | Write-Host

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " TERMINE. Vercel redeploie sous ~2 min." -ForegroundColor Green
Write-Host "============================================"
