#!/usr/bin/env bash
# E2E test : 5 scenarios de depot avec signup integre.
# Execution :
#   bash scripts/e2e-deposit-with-signup.sh
#
# Necessite : curl, jq, node (pour generer image bidon).

set -e

BASE="https://art-core.app"
RUN_ID=$(date +%s)

# Image bidon partagee
node -e "const sharp=require('sharp');sharp({create:{width:200,height:200,channels:3,background:{r:50,g:50,b:50}}}).jpeg({quality:50}).toFile('/tmp/e2e_art.jpg').then(()=>console.log('OK'))" 2>/dev/null || \
  echo "(pas de sharp; on continue avec image inexistante)"

# Helper : execute scenario
run_scenario () {
  local STATUS=$1
  local LABEL=$2
  local NEEDS_MERCHANT=$3
  local NEEDS_CAHIER=$4

  local SUFFIX="${RUN_ID}_${STATUS}"
  local EMAIL="e2e_${SUFFIX}@test.local"
  local USERNAME="e2e_${SUFFIX}"
  local SIRET="9999999999$(printf "%04d" $((RANDOM % 10000)))"

  echo ""
  echo "===== Scenario: $LABEL ($STATUS) ====="
  echo "Email: $EMAIL | Username: $USERNAME | SIRET: $SIRET"

  local PAYLOAD
  if [ "$NEEDS_MERCHANT" = "1" ]; then
    PAYLOAD=$(cat <<EOF
{
  "identity": {
    "role": "$STATUS",
    "full_name": "Test E2E $LABEL",
    "username": "$USERNAME",
    "email": "$EMAIL",
    "password": "TestE2E_${RUN_ID}!",
    "telephone": "+33600000000"
  },
  "merchant": {
    "raison_sociale": "E2E $LABEL ${RUN_ID}",
    "siret": "$SIRET",
    "nom_gerant": "Gerant Test",
    "adresse": "1 rue du Test",
    "code_postal": "75001",
    "ville": "Paris",
    "cahier_police": $NEEDS_CAHIER
  },
  "artwork": {
    "title": "Oeuvre E2E $LABEL ${RUN_ID}",
    "price": 1500,
    "category": "painting",
    "technique": "Huile sur toile",
    "dimensions": "60x80 cm",
    "description": "Test E2E automatique",
    "photos": ["https://placehold.co/600x800/1a1a1a/d4af37?text=$STATUS"]
  }
}
EOF
)
  else
    PAYLOAD=$(cat <<EOF
{
  "identity": {
    "role": "$STATUS",
    "full_name": "Test E2E $LABEL",
    "username": "$USERNAME",
    "email": "$EMAIL",
    "password": "TestE2E_${RUN_ID}!"
  },
  "artwork": {
    "title": "Oeuvre E2E $LABEL ${RUN_ID}",
    "price": 1500,
    "category": "painting",
    "photos": ["https://placehold.co/600x800/1a1a1a/d4af37?text=$STATUS"]
  }
}
EOF
)
  fi

  local RESP=$(curl -sS -X POST "$BASE/api/deposit-with-signup" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    -w "\n__HTTP__%{http_code}")

  local HTTP_CODE=$(echo "$RESP" | grep -o "__HTTP__[0-9]*" | sed 's/__HTTP__//')
  local BODY=$(echo "$RESP" | sed 's/__HTTP__[0-9]*$//')

  echo "HTTP: $HTTP_CODE"
  echo "Body: $BODY" | head -c 600

  if [ "$HTTP_CODE" = "200" ]; then
    local ARTWORK_ID=$(echo "$BODY" | jq -r '.artwork_id // empty')
    local USER_ID=$(echo "$BODY" | jq -r '.user_id // empty')
    local MERCHANT_ID=$(echo "$BODY" | jq -r '.merchant_id // empty')
    echo ""
    echo "✓ user=$USER_ID merchant=${MERCHANT_ID:-'(aucun)'} artwork=$ARTWORK_ID"
    echo "$STATUS|$EMAIL|TestE2E_${RUN_ID}!|$USER_ID|$ARTWORK_ID" >> /tmp/e2e_accounts.txt
  else
    echo ""
    echo "✗ ECHEC ($HTTP_CODE)"
  fi
}

rm -f /tmp/e2e_accounts.txt

run_scenario "artist"      "Artiste"      "0" "false"
run_scenario "galeriste"   "Galeriste"    "1" "true"
run_scenario "antiquaire"  "Antiquaire"   "1" "true"
run_scenario "brocanteur"  "Brocanteur"   "1" "true"
run_scenario "depot_vente" "DepotVente"   "1" "true"

echo ""
echo "===== VERIFICATION CATALOGUE art-core ====="
curl -sS "$BASE/api/artworks?limit=20" | jq -r '.artworks[] | select(.title|tostring|contains("E2E")) | "\(.title) — \(.artist_role // "?") — \(.merchant_raison_sociale // .artist_name // "?")"' || echo "(jq parse failed)"

echo ""
echo "===== COMPTES E2E LAISSES EN DB ====="
cat /tmp/e2e_accounts.txt 2>/dev/null || echo "(aucun)"
