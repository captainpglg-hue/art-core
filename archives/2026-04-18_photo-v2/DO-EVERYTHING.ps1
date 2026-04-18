# ============================================================
# DO-EVERYTHING.ps1 - Un seul script pour tout faire
# 1. SQL : drop FK signup + ajoute colonnes photo-v2
# 2. Install : 8 fichiers photo-v2 sur pass-core
# 3. Git : commit + push (Vercel redeploie)
# 4. Test : signup sur art-core.app
# ============================================================

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$OUTFILE = "do-everything-output.txt"
Remove-Item $OUTFILE -ErrorAction SilentlyContinue
Start-Transcript -Path $OUTFILE -Append | Out-Null

"============================================"
" DO-EVERYTHING - 18 avril 2026"
"============================================"

# ─── ETAPE 1 : SQL via node (DATABASE_URL du .env.local) ───
""
"[1/4] Execution du SQL via Node + DATABASE_URL du .env.local..."
Push-Location art-core
try {
    node .\APPLY-SQL-FIX.mjs
    $sqlExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
if ($sqlExitCode -ne 0) {
    "ECHEC SQL (exit=$sqlExitCode). On continue malgre tout pour l'install photo-v2..."
}

# ─── ETAPE 2 : Install photo-v2 (fichiers) ────────────────
""
"[2/4] Installation module photo-v2..."
& .\INSTALL-PHOTO-V2.ps1
$installExitCode = $LASTEXITCODE
if ($installExitCode -ne 0) {
    "INSTALL-PHOTO-V2 a renvoye exit=$installExitCode, verifier install-photo-v2-output.txt"
}

# ─── ETAPE 3 : Attente Vercel redeploy (90 secondes) ─────
""
"[3/4] Attente 90 secondes pour le redeploiement Vercel..."
for ($i = 90; $i -gt 0; $i -= 15) {
    Write-Host "  $i s restantes..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
}

# ─── ETAPE 4 : Test signup reel ──────────────────────────
""
"[4/4] Test signup reel sur art-core.app..."

function Invoke-Raw($uri, $method, $headers, $body) {
    try {
        $req = [System.Net.WebRequest]::Create($uri)
        $req.Method = $method
        foreach ($k in $headers.Keys) {
            if ($k -eq "Content-Type") { $req.ContentType = $headers[$k] }
            else { $req.Headers.Add($k, $headers[$k]) }
        }
        if ($body) {
            $data = [System.Text.Encoding]::UTF8.GetBytes($body)
            $req.ContentLength = $data.Length
            $stream = $req.GetRequestStream()
            $stream.Write($data, 0, $data.Length)
            $stream.Close()
        }
        $resp = $req.GetResponse()
        $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $text = $sr.ReadToEnd()
        $sr.Close()
        return @{ status = [int]$resp.StatusCode; body = $text }
    } catch [System.Net.WebException] {
        $resp = $_.Exception.Response
        $text = ""
        if ($resp) {
            try {
                $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
                $text = $sr.ReadToEnd()
                $sr.Close()
            } catch { }
            return @{ status = [int]$resp.StatusCode; body = $text }
        }
        return @{ status = 0; body = $_.Exception.Message }
    }
}

$rand = Get-Random -Maximum 999999
$body = @{
    email = "doall-test-$rand@test.com"
    password = "Test1234!"
    name = "DoAll Test"
    username = "doall$rand"
    role = "artist"
} | ConvertTo-Json -Compress
"Body signup : $body"
""

$r = Invoke-Raw "https://art-core.app/api/auth/signup" "POST" @{ "Content-Type" = "application/json" } $body
"HTTP $($r.status)"
"Body reponse :"
$r.body
""
if ($r.status -eq 200) {
    "  => SIGNUP FONCTIONNE !"
} else {
    "  => Echec signup, voir body ci-dessus"
}

""
"============================================"
" RESUME"
"============================================"
"  SQL exit code       : $sqlExitCode (0 = OK)"
"  Install exit code   : $installExitCode (0 = OK)"
"  Signup test status  : HTTP $($r.status) (200 = OK)"
""
"Sortie complete : $OUTFILE"
""
"PROCHAINE ETAPE : teste sur Xiaomi la page"
"  https://pass-core.app/pass-core/certifier"
"Tu dois voir les jauges temps reel (resolution, nettete, expo, score 0-100)"

Stop-Transcript | Out-Null
Write-Host ""
Write-Host "Sortie complete dans : $OUTFILE" -ForegroundColor Green
