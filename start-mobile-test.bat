@echo off
chcp 65001 >nul
title Core Ecosystem - Test Mobile

echo ============================================
echo   CORE ECOSYSTEM - Acces Mobile (ngrok)
echo ============================================
echo.

:: Verifier si ngrok est installe
where ngrok >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ngrok n'est pas installe.
    echo.
    echo INSTALLATION AUTOMATIQUE via winget :
    echo.
    winget install ngrok.ngrok
    echo.
    echo Si winget ne fonctionne pas, telecharge ngrok manuellement :
    echo   https://ngrok.com/download
    echo.
    echo Apres installation, relance ce script.
    pause
    exit /b
)

:: Verifier si ngrok est configure
ngrok config check >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo IMPORTANT : Tu dois d'abord creer un compte gratuit sur https://ngrok.com
    echo Puis copie ton authtoken depuis https://dashboard.ngrok.com/get-started/your-authtoken
    echo.
    set /p AUTHTOKEN=Colle ton authtoken ici :
    ngrok config add-authtoken %AUTHTOKEN%
    echo.
)

echo.
echo Lancement des tunnels pour ART-CORE (3000) et PASS-CORE (3001)...
echo.
echo IMPORTANT : Assure-toi que les deux apps tournent deja :
echo   - Terminal 1 : cd art-core ^&^& npm run dev
echo   - Terminal 2 : cd pass-core ^&^& npm run dev
echo.
echo Appuie sur une touche quand les deux apps sont lancees...
pause >nul

:: Lancer ngrok avec deux tunnels
ngrok start --none --config nul 2>nul
start "ngrok ART-CORE" cmd /c "ngrok http 3000 --log=stdout > ngrok-artcore.log 2>&1"
timeout /t 3 >nul
start "ngrok PASS-CORE" cmd /c "ngrok http 3001 --log=stdout > ngrok-passcore.log 2>&1"
timeout /t 5 >nul

echo.
echo ============================================
echo   TUNNELS ACTIFS
echo ============================================
echo.
echo Ouvre ton navigateur et va sur : http://localhost:4040
echo Tu y trouveras les URLs publiques pour acceder
echo depuis ton Xiaomi.
echo.
echo Ou regarde les fichiers :
echo   - ngrok-artcore.log (URL pour ART-CORE)
echo   - ngrok-passcore.log (URL pour PASS-CORE)
echo.
echo Pour arreter : ferme les fenetres ngrok.
echo ============================================
pause
