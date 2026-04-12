@echo off
chcp 65001 >nul
title Core Ecosystem - Tunnels ngrok

echo ============================================
echo   DEMARRAGE RAPIDE - 2 tunnels ngrok
echo ============================================
echo.
echo Ouverture du tunnel ART-CORE (port 3000)...
start "ngrok-artcore" ngrok http 3000
timeout /t 4 >nul

echo Ouverture du tunnel PASS-CORE (port 3001)...
start "ngrok-passcore" ngrok http 3001
timeout /t 3 >nul

echo.
echo Les deux tunnels sont lances !
echo.
echo Va sur http://localhost:4040 dans ton navigateur
echo pour voir les URLs publiques.
echo.
echo Copie ces URLs et ouvre-les sur ton Xiaomi.
echo.
pause
