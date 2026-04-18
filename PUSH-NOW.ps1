# ============================================================
# PUSH-NOW.ps1 - Push uniquement (les fichiers sont deja copies)
# Evite le piege $ErrorActionPreference=Stop qui interprete les
# warnings Git comme des erreurs fatales.
# ============================================================

$ErrorActionPreference = "Continue"
$env:GIT_TERMINAL_PROMPT = "0"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " PUSH-NOW : commit + push des fichiers v2" -ForegroundColor Cyan
Write-Host "============================================"

Write-Host ""
Write-Host "[1/3] git add..."
git add `
    pass-core/components/certifier `
    pass-core/app/pass-core/certifier/page.tsx `
    pass-core/app/api/fingerprint/route.ts `
    pass-core/lib/fingerprint.ts `
    art-core/lib/fingerprint.ts `
    archives/2026-04-18_photo-v2 `
    sql/2026-04-18_photo-v2-columns.sql `
    INSTALL-PHOTO-V2.ps1 `
    DO-EVERYTHING.ps1 `
    PUSH-NOW.ps1 `
    art-core/APPLY-SQL-FIX.mjs 2>&1 | Out-String | Write-Host

Write-Host ""
Write-Host "[2/3] git commit..."
git commit -m "restore: install photo-module-v2 (jauges + pHash dup detection)" 2>&1 | Out-String | Write-Host

Write-Host ""
Write-Host "[3/3] git push..."
git push 2>&1 | Out-String | Write-Host

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " TERMINE. Vercel va redeployer sous ~2 min." -ForegroundColor Green
Write-Host "============================================"
Write-Host ""
Write-Host "Ensuite teste sur Xiaomi :"
Write-Host "  https://pass-core.app/pass-core/certifier"
