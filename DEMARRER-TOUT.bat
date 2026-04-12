@echo off
chcp 65001 >nul
title CORE ECOSYSTEM - Démarrage complet
color 0E

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║     CORE ECOSYSTEM - DEMARRAGE COMPLET       ║
echo  ║     ART-CORE + PASS-CORE                     ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: Trouver l'IP locale
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0"') do (
    set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP: =%

echo  [1/3] Lancement de ART-CORE (port 3000)...
cd /d "%~dp0art-core"
start "ART-CORE" cmd /c "npm run dev"
cd /d "%~dp0"

timeout /t 3 /nobreak >nul

echo  [2/3] Lancement de PASS-CORE (port 3001)...
cd /d "%~dp0pass-core"
start "PASS-CORE" cmd /c "npm run dev"
cd /d "%~dp0"

timeout /t 5 /nobreak >nul

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║              APPS DEMARREES !                 ║
echo  ╠══════════════════════════════════════════════╣
echo  ║                                              ║
echo  ║  DEPUIS CE PC :                              ║
echo  ║    ART-CORE  : http://localhost:3000          ║
echo  ║    PASS-CORE : http://localhost:3001          ║
echo  ║                                              ║
echo  ║  DEPUIS TON TELEPHONE (meme WiFi) :          ║
echo  ║    ART-CORE  : http://%LOCAL_IP%:3000         ║
echo  ║    PASS-CORE : http://%LOCAL_IP%:3001         ║
echo  ║                                              ║
echo  ║  ADMIN LOGIN :                               ║
echo  ║    Nom   : Philippe Gigon Le Grain            ║
echo  ║    Email : captainpglg@gmail.com              ║
echo  ║    (le code OTP s'auto-remplit)               ║
echo  ║                                              ║
echo  ╠══════════════════════════════════════════════╣
echo  ║  SANS WIFI ? Lance aussi les tunnels ngrok :  ║
echo  ║    Double-clique sur start-mobile-ngrok.bat   ║
echo  ║    Puis va sur http://localhost:4040           ║
echo  ║    pour voir les URLs publiques.              ║
echo  ╚══════════════════════════════════════════════╝
echo.
echo  Pour arreter : ferme les fenetres ART-CORE et PASS-CORE.
echo.
pause
