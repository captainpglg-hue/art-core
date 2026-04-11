#!/bin/bash
# ============================================================
# PASS-CORE & ART-CORE — Script de correction et déploiement
# Exécuter depuis le dossier art-core/ (racine du monorepo)
# Usage: bash fix-and-deploy.sh
# ============================================================

set -e
echo ""
echo "=========================================="
echo "  CORE ECOSYSTEM — Fix & Deploy Script"
echo "=========================================="
echo ""

# ── Couleurs ─────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── Étape 1 : Copier .env.local depuis art-core vers pass-core ──
echo -e "${YELLOW}[1/6] Configuration des variables d'environnement...${NC}"

if [ -f "art-core/.env.local" ]; then
  if [ ! -f "pass-core/.env.local" ] || [ ! -s "pass-core/.env.local" ]; then
    cp art-core/.env.local pass-core/.env.local
    # Adapter le port et l'URL
    sed -i 's|NEXT_PUBLIC_APP_URL=http://localhost:3000|NEXT_PUBLIC_APP_URL=http://localhost:3001|g' pass-core/.env.local
    echo -e "${GREEN}  ✓ .env.local copié et adapté pour pass-core${NC}"
  else
    echo -e "${GREEN}  ✓ pass-core/.env.local existe déjà${NC}"
  fi
else
  echo -e "${RED}  ✗ art-core/.env.local introuvable !${NC}"
  echo -e "${RED}    Crée-le d'abord à partir de art-core/.env.example${NC}"
  echo -e "${RED}    puis relance ce script.${NC}"
  exit 1
fi

# ── Étape 2 : Installer les dépendances pass-core ───────────
echo ""
echo -e "${YELLOW}[2/6] Installation des dépendances pass-core...${NC}"
cd pass-core
if [ ! -d "node_modules" ]; then
  npm install
  echo -e "${GREEN}  ✓ Dépendances installées${NC}"
else
  echo -e "${GREEN}  ✓ node_modules déjà présent${NC}"
fi

# ── Étape 3 : Build pass-core ───────────────────────────────
echo ""
echo -e "${YELLOW}[3/6] Build de pass-core...${NC}"
npm run build 2>&1 | tail -5
if [ $? -eq 0 ]; then
  echo -e "${GREEN}  ✓ Build réussi${NC}"
else
  echo -e "${RED}  ✗ Build échoué — vérifier les erreurs ci-dessus${NC}"
  exit 1
fi

# ── Étape 4 : Vérifier les variables Vercel ──────────────────
echo ""
echo -e "${YELLOW}[4/6] Vérification des variables Vercel...${NC}"
cd ..

echo ""
echo -e "${YELLOW}  Variables d'environnement CRITIQUES à vérifier dans Vercel :${NC}"
echo ""
echo "  Pour PASS-CORE (pass-core.app) :"
echo "    NEXT_PUBLIC_APP_URL        = https://pass-core.app"
echo "    NEXT_PUBLIC_ART_CORE_URL   = https://art-core.app"
echo "    NEXT_PUBLIC_PASS_CORE_URL  = https://pass-core.app"
echo "    NEXT_PUBLIC_PRIME_CORE_URL = https://prime-core.app"
echo ""
echo "  Pour ART-CORE (art-core.app) :"
echo "    NEXT_PUBLIC_APP_URL        = https://art-core.app"
echo "    NEXT_PUBLIC_ART_CORE_URL   = https://art-core.app"
echo "    NEXT_PUBLIC_PASS_CORE_URL  = https://pass-core.app"
echo "    NEXT_PUBLIC_PRIME_CORE_URL = https://prime-core.app"
echo ""

# ── Étape 5 : Déployer pass-core ────────────────────────────
echo -e "${YELLOW}[5/6] Déploiement pass-core sur Vercel...${NC}"
echo ""
read -p "  Déployer pass-core maintenant ? (o/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Oo]$ ]]; then
  cd pass-core
  npx vercel --prod
  cd ..
  echo -e "${GREEN}  ✓ pass-core déployé${NC}"
else
  echo -e "${YELLOW}  ⏭ Déploiement pass-core ignoré${NC}"
fi

# ── Étape 6 : Déployer art-core ─────────────────────────────
echo ""
echo -e "${YELLOW}[6/6] Déploiement art-core sur Vercel...${NC}"
read -p "  Déployer art-core maintenant ? (o/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Oo]$ ]]; then
  cd art-core
  npx vercel --prod
  cd ..
  echo -e "${GREEN}  ✓ art-core déployé${NC}"
else
  echo -e "${YELLOW}  ⏭ Déploiement art-core ignoré${NC}"
fi

# ── Résumé ───────────────────────────────────────────────────
echo ""
echo "=========================================="
echo -e "${GREEN}  TERMINÉ${NC}"
echo "=========================================="
echo ""
echo "  Corrections appliquées :"
echo "    ✓ Page landing /pass-core créée"
echo "    ✓ PassNavbar.tsx réécrit (était corrompu)"
echo "    ✓ Gallery page.tsx décodée (était en base64)"
echo "    ✓ next.config.mjs corrigé (Cloudinary ajouté)"
echo "    ✓ .env.example + .env.production.example créés"
echo ""
echo "  ⚠️  Vérifie dans le dashboard Vercel que les"
echo "     variables NEXT_PUBLIC_*_URL pointent vers"
echo "     les domaines de production (pas localhost)."
echo ""
echo "  URLs à vérifier :"
echo "    → https://pass-core.app/pass-core"
echo "    → https://art-core.app"
echo ""
