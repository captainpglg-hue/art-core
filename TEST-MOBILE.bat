@echo off
chcp 65001 >nul
title CORE ECOSYSTEM — TEST MOBILE (Beta Tester)
color 0E

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║                                                      ║
echo  ║        CORE ECOSYSTEM — TEST MOBILE                  ║
echo  ║        Mode Beta Tester (sans WiFi)                  ║
echo  ║                                                      ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
echo  Ce script lance les 2 apps + 2 tunnels publics.
echo  Tu pourras tester depuis ton Xiaomi en 4G/5G.
echo.
echo  ─────────────────────────────────────────────────
echo   ETAPE 1/4 — Demarrage ART-CORE (port 3000)
echo  ─────────────────────────────────────────────────

cd /d "%~dp0art-core"
start "ART-CORE — App" cmd /k "color 0A && echo [ART-CORE] Demarrage... && npm run dev"
cd /d "%~dp0"

echo  [OK] ART-CORE lance.
echo.
timeout /t 4 /nobreak >nul

echo  ─────────────────────────────────────────────────
echo   ETAPE 2/4 — Demarrage PASS-CORE (port 3001)
echo  ─────────────────────────────────────────────────

cd /d "%~dp0pass-core"
start "PASS-CORE — App" cmd /k "color 0B && echo [PASS-CORE] Demarrage... && npm run dev"
cd /d "%~dp0"

echo  [OK] PASS-CORE lance.
echo.
echo  Attente du demarrage des apps (10 sec)...
timeout /t 10 /nobreak >nul

echo.
echo  ─────────────────────────────────────────────────
echo   ETAPE 3/4 — Tunnel ART-CORE (vers Internet)
echo  ─────────────────────────────────────────────────

cd /d "%~dp0art-core"
start "ART-CORE — Tunnel" cmd /k "color 0E && echo [TUNNEL] ART-CORE — Creation du tunnel public... && npx -y localtunnel --port 3000 --subdomain artcore-test"
cd /d "%~dp0"

echo  [OK] Tunnel ART-CORE lance.
echo.
timeout /t 5 /nobreak >nul

echo  ─────────────────────────────────────────────────
echo   ETAPE 4/4 — Tunnel PASS-CORE (vers Internet)
echo  ─────────────────────────────────────────────────

cd /d "%~dp0pass-core"
start "PASS-CORE — Tunnel" cmd /k "color 0D && echo [TUNNEL] PASS-CORE — Creation du tunnel public... && npx -y localtunnel --port 3001 --subdomain passcore-test"
cd /d "%~dp0"

echo  [OK] Tunnel PASS-CORE lance.
echo.
timeout /t 5 /nobreak >nul

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║                                                      ║
echo  ║        TOUT EST PRET !                               ║
echo  ║                                                      ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║                                                      ║
echo  ║  URLS POUR TON XIAOMI :                              ║
echo  ║                                                      ║
echo  ║  ART-CORE :                                          ║
echo  ║    https://artcore-test.loca.lt                      ║
echo  ║    Admin : /art-core/admin/login                     ║
echo  ║                                                      ║
echo  ║  PASS-CORE :                                         ║
echo  ║    https://passcore-test.loca.lt                     ║
echo  ║    Admin : /pass-core/admin/login                    ║
echo  ║                                                      ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║                                                      ║
echo  ║  IDENTIFIANTS ADMIN :                                ║
echo  ║    Nom   : Philippe Gigon Le Grain                   ║
echo  ║    Email : captainpglg@gmail.com                     ║
echo  ║    Le code OTP s'affiche automatiquement.            ║
echo  ║                                                      ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║                                                      ║
echo  ║  NOTE : Si le sous-domaine est deja pris,            ║
echo  ║  regarde les fenetres "Tunnel" pour l'URL            ║
echo  ║  exacte attribuee.                                   ║
echo  ║                                                      ║
echo  ║  Page de securite localtunnel :                      ║
echo  ║  Clique "Click to Continue" la premiere fois.        ║
echo  ║                                                      ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║                                                      ║
echo  ║  4 fenetres ouvertes :                               ║
echo  ║    1. ART-CORE (verte)   - l'app                     ║
echo  ║    2. PASS-CORE (bleue)  - l'app                     ║
echo  ║    3. Tunnel ART-CORE (jaune)  - le tunnel           ║
echo  ║    4. Tunnel PASS-CORE (violet) - le tunnel          ║
echo  ║                                                      ║
echo  ║  Pour tout arreter : ferme les 4 fenetres.           ║
echo  ║                                                      ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
pause
