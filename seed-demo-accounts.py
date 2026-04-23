#!/usr/bin/env python3
"""
seed-demo-accounts.py - Cree les 4 comptes pros demo manquants en prod
                        + imprime le SQL pour seeder les profils merchants.

Usage :
  python seed-demo-accounts.py
  python seed-demo-accounts.py --base https://art-core.app
  python seed-demo-accounts.py --local

Ce que ca fait :
  1. POST /api/auth/signup pour chacun des 4 comptes pros (antiquaire,
     galeriste, brocanteur, depot_vente).
  2. Si le compte existe deja (HTTP 409) -> skip silencieux.
  3. A la fin, imprime un bloc SQL a coller dans Supabase SQL Editor pour
     creer les profils marchand (necessaires pour declencher la fiche-police).

Pre-requis : pip install requests
"""

import argparse
import sys

try:
    import requests
except ImportError:
    sys.exit("Manque requests. Installe : pip install requests")

# Force UTF-8 stdout sur Windows
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


ACCOUNTS = [
    {
        "email": "antiquaire@demo.com",
        "password": "password123",
        "name": "Antiquaire Demo",
        "username": "antiquaire-demo",
        "role": "antiquaire",
        # Donnees merchant
        "raison_sociale": "Antiquites Demo SARL",
        "siret": "12345678900011",
        "activite": "Antiquaire",
        "nom_gerant": "Antiquaire Demo",
        "telephone": "+33100000001",
        "adresse": "1 rue de la Demo",
        "code_postal": "75001",
        "ville": "Paris",
    },
    {
        "email": "galeriste@demo.com",
        "password": "password123",
        "name": "Galeriste Demo",
        "username": "galeriste-demo",
        "role": "galeriste",
        "raison_sociale": "Galerie Demo SAS",
        "siret": "12345678900022",
        "activite": "Galeriste",
        "nom_gerant": "Galeriste Demo",
        "telephone": "+33100000002",
        "adresse": "2 rue de la Demo",
        "code_postal": "75002",
        "ville": "Paris",
    },
    {
        "email": "brocanteur@demo.com",
        "password": "password123",
        "name": "Brocanteur Demo",
        "username": "brocanteur-demo",
        "role": "brocanteur",
        "raison_sociale": "Brocante Demo EI",
        "siret": "12345678900033",
        "activite": "Brocanteur",
        "nom_gerant": "Brocanteur Demo",
        "telephone": "+33100000003",
        "adresse": "3 rue de la Demo",
        "code_postal": "75003",
        "ville": "Paris",
    },
    {
        "email": "depot-vente@demo.com",
        "password": "password123",
        "name": "Depot-Vente Demo",
        "username": "depot-vente-demo",
        "role": "depot_vente",
        "raison_sociale": "Depot-Vente Demo SARL",
        "siret": "12345678900044",
        "activite": "Depot-vente",
        "nom_gerant": "Depot-Vente Demo",
        "telephone": "+33100000004",
        "adresse": "4 rue de la Demo",
        "code_postal": "75004",
        "ville": "Paris",
    },
]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--base", default="https://art-core.app",
                   help="URL de base art-core (default: prod)")
    p.add_argument("--local", action="store_true",
                   help="utilise http://localhost:3000")
    args = p.parse_args()

    base = "http://localhost:3000" if args.local else args.base.rstrip("/")

    print("================================================================")
    print(f"  seed-demo-accounts.py - cible {base}")
    print("================================================================")

    created_user_ids = {}  # email -> id

    for acc in ACCOUNTS:
        payload = {
            "email":    acc["email"],
            "password": acc["password"],
            "name":     acc["name"],
            "username": acc["username"],
            "role":     acc["role"],
        }
        try:
            r = requests.post(f"{base}/api/auth/signup", json=payload, timeout=20)
        except Exception as e:
            print(f"  [NETWORK] {acc['email']:30} -> {e}")
            continue

        if r.status_code == 200:
            try:
                user_id = r.json().get("user", {}).get("id")
                created_user_ids[acc["email"]] = user_id
                print(f"  [CREATED] {acc['email']:30} role={acc['role']:12} id={str(user_id)[:8]}...")
            except Exception:
                print(f"  [CREATED] {acc['email']:30} role={acc['role']:12} (id non parse)")
        elif r.status_code == 409:
            print(f"  [EXISTS]  {acc['email']:30} (deja present, skip)")
        else:
            try:
                err = r.json().get("error", r.text[:200])
            except Exception:
                err = r.text[:200]
            print(f"  [FAIL]    {acc['email']:30} HTTP {r.status_code}: {err}")

    # ── Bloc SQL pour merchants ────────────────────────────────────────────
    print()
    print("================================================================")
    print("  PROCHAINE ETAPE - copie-colle le SQL ci-dessous dans :")
    print("  https://supabase.com/dashboard/project/kmmlwuwsahtzgzztcdaj/sql/new")
    print("  Puis clique RUN.")
    print("================================================================")
    print()
    print("-- Cree les profils merchant pour les 4 comptes pros demo")
    print("-- (necessaires pour declencher la fiche-police automatique)")
    print()
    print("INSERT INTO merchants (id, user_id, raison_sociale, siret, activite,")
    print("                       nom_gerant, email, telephone, adresse,")
    print("                       code_postal, ville, actif, created_at)")
    print("SELECT")
    print("  gen_random_uuid(), u.id, m.raison_sociale, m.siret, m.activite,")
    print("  m.nom_gerant, u.email, m.telephone, m.adresse,")
    print("  m.code_postal, m.ville, true, NOW()")
    print("FROM users u")
    print("JOIN (VALUES")
    rows = []
    for acc in ACCOUNTS:
        rows.append(
            f"  ('{acc['email']}', '{acc['raison_sociale']}', '{acc['siret']}', "
            f"'{acc['activite']}', '{acc['nom_gerant']}', '{acc['telephone']}', "
            f"'{acc['adresse']}', '{acc['code_postal']}', '{acc['ville']}')"
        )
    print(",\n".join(rows))
    print(") AS m(email, raison_sociale, siret, activite, nom_gerant,")
    print("       telephone, adresse, code_postal, ville)")
    print("ON u.email = m.email")
    print("WHERE NOT EXISTS (")
    print("  SELECT 1 FROM merchants WHERE user_id = u.id")
    print(");")
    print()
    print("-- Verif (doit retourner 4 lignes apres le INSERT) :")
    print("SELECT u.email, u.role, m.raison_sociale, m.siret, m.actif")
    print("FROM users u JOIN merchants m ON m.user_id = u.id")
    print("WHERE u.email IN (")
    print(",\n".join([f"  '{a['email']}'" for a in ACCOUNTS]))
    print(");")
    print()
    print("================================================================")
    print("  Apres le RUN reussi, relance :")
    print("    python test-deposit-flow.py")
    print("  Les 4 pros devraient passer login + deposit + fiche-police.")
    print("================================================================")


if __name__ == "__main__":
    main()
