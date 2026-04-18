@echo off
REM ============================================================
REM FINIR-TOUT.bat - Un seul double-clic pour tout terminer
REM 1. git push des 2 commits (photo-v2 + fix 413)
REM 2. SQL via Node (essaie plusieurs connexions)
REM 3. Test signup
REM ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo  FINIR-TOUT - 18 avril 2026
echo ============================================================
echo.

echo [1/5] git add des 2 commits photo-v2 + fix 413...
git add pass-core/components/certifier ^
 pass-core/app/pass-core/certifier/page.tsx ^
 pass-core/app/api/fingerprint/route.ts ^
 pass-core/lib/fingerprint.ts ^
 art-core/lib/fingerprint.ts ^
 art-core/APPLY-SQL-FIX.mjs ^
 archives/2026-04-18_photo-v2 ^
 photo-module-v2/components/ConfirmStep.tsx ^
 sql/2026-04-18_photo-v2-columns.sql ^
 INSTALL-PHOTO-V2.ps1 ^
 DO-EVERYTHING.ps1 ^
 PUSH-NOW.ps1 ^
 PUSH-FIX-413.ps1 ^
 FINIR-TOUT.bat 2>&1

echo.
echo [2/5] git commit...
git commit -m "restore: photo-module-v2 (jauges + pHash + fix 413 compression)" 2>&1

echo.
echo [3/5] git push...
git push 2>&1

echo.
echo [4/5] SQL via Node (essaie plusieurs connexions)...
cd art-core
node APPLY-SQL-FIX.mjs
set SQL_RESULT=%ERRORLEVEL%
cd ..

echo.
if %SQL_RESULT%==0 (
  echo [SQL] OK - signup 500 fixe et colonnes pHash creees
) else (
  echo [SQL] ECHEC - il faudra faire manuellement :
  echo.
  echo   1. Ouvre ce lien dans ton navigateur :
  echo      https://supabase.com/dashboard/project/kmmlwuwsahtzgzztcdaj/sql/new
  echo.
  echo   2. Colle ce bloc et clique Run :
  echo      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
  echo      ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS macro_fingerprint TEXT;
  echo      ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS p_hash TEXT;
  echo      CREATE INDEX IF NOT EXISTS idx_artworks_p_hash ON public.artworks (p_hash) WHERE p_hash IS NOT NULL;
)

echo.
echo [5/5] Attends 90 secondes que Vercel redeploie puis teste signup...
timeout /t 90 /nobreak

echo.
echo Test signup...
powershell -ExecutionPolicy Bypass -File .\TEST-SIGNUP-ONLY.ps1

echo.
echo ============================================================
echo  FINI. Verifie la sortie ci-dessus.
echo  Teste ensuite sur Xiaomi :
echo    https://pass-core.app/pass-core/certifier
echo ============================================================
pause
