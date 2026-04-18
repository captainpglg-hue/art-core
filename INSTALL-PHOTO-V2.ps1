# ============================================================
# INSTALL-PHOTO-V2.ps1 - Installation module photo v2 sur pass-core
# Restaure les jauges qualite en temps reel + detection de doublons pHash
#
# Avant : ancien monolithe 921 lignes sans jauges
# Apres : 4 composants modulaires + page orchestratrice + pHash
#
# Execution :
#   cd 'C:\Users\Gigon Le Grain\Desktop\art-core'
#   .\INSTALL-PHOTO-V2.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$OUTFILE = "install-photo-v2-output.txt"
Remove-Item $OUTFILE -ErrorAction SilentlyContinue
Start-Transcript -Path $OUTFILE -Append | Out-Null

$ARCHIVE_DIR = "archives/2026-04-18_photo-v2"

"============================================"
" INSTALL-PHOTO-V2 - 18 avril 2026"
"============================================"
""
"[0/5] Preparation des dossiers d'archive..."
New-Item -ItemType Directory -Force -Path "$ARCHIVE_DIR/old-versions" | Out-Null
New-Item -ItemType Directory -Force -Path "$ARCHIVE_DIR/installed-files" | Out-Null
New-Item -ItemType Directory -Force -Path "pass-core/components/certifier" | Out-Null

# ── Definition des moves ────────────────────────────────────
$moves = @(
    @{ src = "photo-module-v2/components/useCameraMacro.ts";    dst = "pass-core/components/certifier/useCameraMacro.ts";    name = "useCameraMacro.ts" },
    @{ src = "photo-module-v2/components/CaptureStep.tsx";      dst = "pass-core/components/certifier/CaptureStep.tsx";      name = "CaptureStep.tsx (JAUGES temps reel)" },
    @{ src = "photo-module-v2/components/PreviewStep.tsx";      dst = "pass-core/components/certifier/PreviewStep.tsx";      name = "PreviewStep.tsx" },
    @{ src = "photo-module-v2/components/ConfirmStep.tsx";      dst = "pass-core/components/certifier/ConfirmStep.tsx";      name = "ConfirmStep.tsx" },
    @{ src = "photo-module-v2/pass-core-certifier-page.tsx";    dst = "pass-core/app/pass-core/certifier/page.tsx";           name = "certifier/page.tsx (remplace monolithe 921 lignes)" },
    @{ src = "photo-module-v2/pass-core-api-fingerprint-route.ts"; dst = "pass-core/app/api/fingerprint/route.ts";            name = "api/fingerprint/route.ts (dup detection)" },
    @{ src = "photo-module-v2/pass-core-lib-fingerprint.ts";    dst = "pass-core/lib/fingerprint.ts";                         name = "pass-core/lib/fingerprint.ts" },
    @{ src = "photo-module-v2/art-core-lib-fingerprint.ts";     dst = "art-core/lib/fingerprint.ts";                          name = "art-core/lib/fingerprint.ts" }
)

# ── Verification sources ────────────────────────────────────
""
"[1/5] Verification des 8 fichiers sources dans photo-module-v2/..."
$allOk = $true
foreach ($m in $moves) {
    if (-not (Test-Path $m.src)) {
        "MANQUE : $($m.src)"
        $allOk = $false
    } else {
        $sz = (Get-Item $m.src).Length
        "OK     : $($m.src) ($sz bytes)"
    }
}
if (-not $allOk) {
    "ECHEC : au moins un fichier source manque. Arret."
    Stop-Transcript | Out-Null
    exit 1
}

# ── Archivage des anciennes versions ────────────────────────
""
"[2/5] Archivage des anciennes versions dans $ARCHIVE_DIR/old-versions/..."
foreach ($m in $moves) {
    if (Test-Path $m.dst) {
        $archName = ($m.dst -replace "[\\/]", "__")
        Copy-Item $m.dst "$ARCHIVE_DIR/old-versions/$archName" -Force
        $sz = (Get-Item $m.dst).Length
        "archive : $($m.dst) ($sz bytes)  =>  old-versions/$archName"
    } else {
        "noexist : $($m.dst) (rien a archiver)"
    }
}

# ── Copie des nouvelles versions ────────────────────────────
""
"[3/5] Copie des nouvelles versions v2..."
foreach ($m in $moves) {
    $dstDir = Split-Path $m.dst -Parent
    if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
    }
    Copy-Item $m.src $m.dst -Force
    $archName = ($m.dst -replace "[\\/]", "__")
    Copy-Item $m.dst "$ARCHIVE_DIR/installed-files/$archName" -Force
    $sz = (Get-Item $m.dst).Length
    "installe : $($m.dst) ($sz bytes)  [$($m.name)]"
}

# ── Journal ─────────────────────────────────────────────────
""
"[4/5] Ecriture du journal d'installation..."
$journal = @"
# Journal d'installation photo-v2 - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Contexte
Restauration des jauges qualite photo (resolution, nettete via Laplacien,
exposition, score 0-100) qui avaient disparu. La page pass-core/certifier
etait restee sur l'ancien monolithe de 921 lignes qui n'avait aucune jauge.

Le package photo-module-v2 existait sur disque mais n'avait jamais ete
installe (ou avait ete desinstalle par le commit e7e31ad du 8 avril).

## Fichiers copies
$(foreach ($m in $moves) { "- $($m.dst) ($($m.name))" })

## Dependances
- sharp ^0.34.5 : deja dans pass-core/package.json
- lucide-react ^0.378.0 : deja dans pass-core/package.json
(Aucun npm install necessaire)

## SQL optionnel
Pour activer la detection de doublons pHash :
- executer sql/2026-04-18_photo-v2-columns.sql dans Supabase SQL Editor
- les jauges fonctionnent meme sans ce SQL (purement client-side)

## Rollback
Les 8 anciens fichiers sont dans $ARCHIVE_DIR/old-versions/
Pour annuler : restore chacun depuis son archive.
"@
Set-Content -Path "$ARCHIVE_DIR/JOURNAL.md" -Value $journal -Encoding utf8
"ecrit : $ARCHIVE_DIR/JOURNAL.md"

# ── Git ────────────────────────────────────────────────────
""
"[5/5] Git add + commit + push..."
git add pass-core/components/certifier/ pass-core/app/pass-core/certifier/page.tsx pass-core/app/api/fingerprint/route.ts pass-core/lib/fingerprint.ts art-core/lib/fingerprint.ts $ARCHIVE_DIR/ sql/2026-04-18_photo-v2-columns.sql INSTALL-PHOTO-V2.ps1 2>&1 | ForEach-Object { "git add: $_" }

$commitMsg = @"
restore: install photo-module-v2 on pass-core

- 4 composants certifier: useCameraMacro (Laplacien), CaptureStep (jauges
  temps reel), PreviewStep (pHash dup detection), ConfirmStep
- page certifier v2 (149 lignes) remplace le monolithe 921 lignes
- /api/fingerprint v2 : detection de doublons perceptuelle (sharp aHash/dHash)
- pass-core/lib/fingerprint et art-core/lib/fingerprint upgrades
- anciennes versions archivees dans archives/2026-04-18_photo-v2/

Restaure les jauges de qualite photo (resolution, nettete, exposition,
score 0-100) disparues suite au commit e7e31ad du 8 avril.
"@
git commit -m $commitMsg 2>&1 | ForEach-Object { "git commit: $_" }

"Push vers origin/main..."
git push 2>&1 | ForEach-Object { "git push: $_" }

""
"============================================"
" INSTALLATION TERMINEE"
"============================================"
"Vercel va detecter le push et redeployer automatiquement."
"Attends ~2 minutes, puis teste depuis ton Xiaomi :"
"  https://pass-core.app/pass-core/certifier"
""
'Tu dois voir :'
'  1. Un ecran d''intro Certifie ton oeuvre avec 3 etapes'
'  2. Bouton Commencer => active la camera arriere'
'  3. Overlay carre au centre avec coins blancs + cible'
'  4. Bord du carre ROUGE quand qualite insuffisante, OR quand OK'
'  5. Barre en bas : X MP - nettete Y% - expo Z% + score global'
'  6. Bouton capture DESACTIVE tant que score < 60/100'
""
"Pour activer la detection de doublons (optionnel, les jauges marchent sans) :"
"  - SQL Editor Supabase : copie le contenu de sql/2026-04-18_photo-v2-columns.sql"
"  - clic Run"
""
"Sortie complete dans : $OUTFILE"
Stop-Transcript | Out-Null
Write-Host ""
Write-Host "Termine. Check $OUTFILE pour le detail." -ForegroundColor Green
