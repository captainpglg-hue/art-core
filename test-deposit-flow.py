#!/usr/bin/env python3
"""
test-deposit-flow.py — Harnais de test E2E pour le parcours de dépôt d'œuvre
sur art-core.app + pass-core.app.

Couvre :
  - Login pour chaque rôle (artist, antiquaire, brocanteur, depot_vente,
    galeriste, initie, client/particulier)
  - Upload photo principale (multipart vers /api/upload-photo)
  - POST /api/artworks avec photos[]
  - Vérification que l'œuvre apparaît dans /api/artworks (listing public)
  - Pour rôles pros (antiquaire, galeriste, brocanteur, depot_vente) :
    vérification que la fiche de police a été déclenchée + email envoyé
  - Test bonus : certification pass-core (/api/certify) avec macro photos
    pour artist + antiquaire

Usage :
  python test-deposit-flow.py
  python test-deposit-flow.py --base-art https://art-core.app --base-pass https://pass-core.app
  python test-deposit-flow.py --local      # utilise http://localhost:3000 / :3001
  python test-deposit-flow.py --only artist
  python test-deposit-flow.py --skip-cert  # saute le test certification

Dépendances :
  pip install requests pillow

Sortie :
  Rapport colorisé par rôle, avec PASS/FAIL et raison.
  Exit code 0 si tout passe, 1 sinon.
"""

import argparse
import io
import json
import os
import random
import sys
import time
from datetime import datetime

# Force UTF-8 sur stdout/stderr pour eviter UnicodeEncodeError sur Windows (cp1252)
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

try:
    import requests
except ImportError:
    sys.exit("Manque requests. Installe avec : pip install requests pillow")

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("Manque pillow. Installe avec : pip install requests pillow")


# ─── Config ────────────────────────────────────────────────────────────────────

DEMO_PASSWORD = "password123"

# Comptes démo par rôle (REPRENDRE-ICI.md). Si absents, le test signale.
DEMO_ACCOUNTS = {
    "artist":      "artist@demo.com",
    "antiquaire":  "antiquaire@demo.com",
    "brocanteur":  "brocanteur@demo.com",
    "depot_vente": "depot-vente@demo.com",   # à créer si absent
    "galeriste":   "galeriste@demo.com",     # à créer si absent
    "initie":      "initie@demo.com",
    "client":      "client@demo.com",        # = "particulier"
}

# Rôles autorisés à déposer (cf. art-core/app/api/artworks/route.ts L86)
ROLES_CAN_DEPOSIT = {"artist", "antiquaire", "galeriste", "brocanteur", "depot_vente"}

# Rôles déclenchant fiche-police (cf. ROLES_FICHE_POLICE L10)
ROLES_FICHE_POLICE = {"antiquaire", "galeriste", "brocanteur", "depot_vente"}


# ─── Tags terminal (ASCII pur, pas de couleur ANSI) ────────────────────────────
# Les couleurs ANSI s'affichent en garbage sur PowerShell 5.1 par defaut.
# Tags textuels = lisible partout.

class C:
    G = ""; R = ""; Y = ""; B = ""
    BOLD = ""; DIM = ""; END = ""

def pass_(msg): print(f"  [PASS]  {msg}")
def fail_(msg): print(f"  [FAIL]  {msg}")
def warn_(msg): print(f"  [WARN]  {msg}")
def info_(msg): print(f"  [info]  {msg}")


# ─── Génération d'images de test (vraies JPEGs) ────────────────────────────────

def make_jpeg(label: str, size=(800, 600), seed: int = None) -> bytes:
    """Crée une JPEG colorée avec un label, parfaitement valide."""
    if seed is not None:
        random.seed(seed)
    img = Image.new("RGB", size, color=tuple(random.randint(40, 200) for _ in range(3)))
    draw = ImageDraw.Draw(img)
    # Bandes colorées pour donner du contenu (pas une image uniforme)
    for i in range(0, size[1], 20):
        draw.rectangle(
            [0, i, size[0], i + 10],
            fill=tuple(random.randint(0, 255) for _ in range(3)),
        )
    # Label
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 40)
    except Exception:
        font = ImageFont.load_default()
    draw.rectangle([10, 10, size[0] - 10, 80], fill=(0, 0, 0))
    draw.text((20, 20), label, fill=(255, 255, 255), font=font)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def make_macro_jpeg(label: str, seed: int) -> bytes:
    """Macro = haute résolution avec pattern texturé (pour fingerprint)."""
    return make_jpeg(label, size=(1600, 1200), seed=seed)


# ─── Client API ────────────────────────────────────────────────────────────────

class ArtCoreClient:
    def __init__(self, base_art: str, base_pass: str):
        self.base_art = base_art.rstrip("/")
        self.base_pass = base_pass.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "test-deposit-flow.py"})
        self.user = None  # populé après login

    # ── Auth ────────────────────────────────────────────────────────────────

    def login(self, email: str, password: str) -> tuple[bool, str]:
        try:
            r = self.session.post(
                f"{self.base_art}/api/auth/login",
                json={"email": email, "password": password},
                timeout=15,
            )
        except Exception as e:
            return False, f"network: {e}"
        if r.status_code != 200:
            try:
                msg = r.json().get("error", r.text[:200])
            except Exception:
                msg = r.text[:200]
            return False, f"HTTP {r.status_code}: {msg}"
        try:
            self.user = r.json().get("user")
        except Exception:
            return False, "réponse non-JSON"
        return True, f"connecté id={self.user.get('id','?')[:8]} role={self.user.get('role','?')}"

    def logout(self):
        try:
            self.session.post(f"{self.base_art}/api/auth/logout", timeout=10)
        except Exception:
            pass
        self.session.cookies.clear()
        self.user = None

    # ── Upload photo (art-core) ─────────────────────────────────────────────

    def upload_photo(self, jpeg_bytes: bytes, filename: str) -> tuple[bool, str]:
        files = {"photo": (filename, jpeg_bytes, "image/jpeg")}
        try:
            r = self.session.post(f"{self.base_art}/api/upload-photo", files=files, timeout=30)
        except Exception as e:
            return False, f"network: {e}"
        if r.status_code != 200:
            try:
                msg = r.json().get("error", r.text[:200])
            except Exception:
                msg = r.text[:200]
            return False, f"HTTP {r.status_code}: {msg}"
        try:
            url = r.json().get("url")
        except Exception:
            return False, "réponse non-JSON"
        if not url:
            return False, "url manquante dans la réponse"
        return True, url

    # ── Dépôt d'œuvre (art-core) ────────────────────────────────────────────

    def post_artwork(self, payload: dict) -> tuple[bool, dict]:
        try:
            r = self.session.post(f"{self.base_art}/api/artworks", json=payload, timeout=30)
        except Exception as e:
            return False, {"error": f"network: {e}"}
        try:
            data = r.json()
        except Exception:
            return False, {"error": f"HTTP {r.status_code}, réponse non-JSON: {r.text[:200]}"}
        if r.status_code != 200:
            return False, {"error": f"HTTP {r.status_code}: {data.get('error', '')}", "raw": data}
        return True, data

    # ── Listing public ──────────────────────────────────────────────────────

    def find_artwork(self, artwork_id: str) -> bool:
        try:
            r = requests.get(f"{self.base_art}/api/artworks?limit=50", timeout=15)
            if r.status_code != 200:
                return False
            arts = r.json().get("artworks", [])
            return any(a.get("id") == artwork_id for a in arts)
        except Exception:
            return False

    # ── Certification (pass-core, multipart avec macro photos) ──────────────

    def certify(self, payload_fields: dict, main_jpeg: bytes,
                macro_jpeg: bytes, macro_extras: list[bytes]) -> tuple[bool, dict]:
        files = [
            ("main_photo", ("main.jpg", main_jpeg, "image/jpeg")),
            ("macro_photo", ("macro1.jpg", macro_jpeg, "image/jpeg")),
        ]
        for i, m in enumerate(macro_extras):
            files.append(("macro_photos", (f"macro{i+2}.jpg", m, "image/jpeg")))
        try:
            r = self.session.post(
                f"{self.base_pass}/api/certify",
                data=payload_fields,
                files=files,
                timeout=60,
            )
        except Exception as e:
            return False, {"error": f"network: {e}"}
        try:
            data = r.json()
        except Exception:
            return False, {"error": f"HTTP {r.status_code}, réponse non-JSON: {r.text[:200]}"}
        if r.status_code != 200:
            return False, {"error": f"HTTP {r.status_code}: {data.get('error', '')}", "raw": data}
        return True, data


# ─── Tests par rôle ────────────────────────────────────────────────────────────

def test_role(role: str, email: str, base_art: str, base_pass: str,
              do_cert: bool) -> dict:
    """Exécute le parcours complet pour un rôle. Retourne dict résumé."""
    print()
    print(f"=== {role.upper()} ({email}) ===")
    result = {"role": role, "email": email, "steps": [], "ok": True}

    client = ArtCoreClient(base_art, base_pass)

    # 1. Login
    ok, msg = client.login(email, DEMO_PASSWORD)
    if ok:
        pass_(f"login : {msg}")
        result["steps"].append(("login", "PASS", msg))
    else:
        fail_(f"login : {msg}")
        result["steps"].append(("login", "FAIL", msg))
        result["ok"] = False
        if "401" in msg:
            warn_(f"compte {email} probablement absent — à créer via /api/auth/signup")
        return result

    actual_role = client.user.get("role")
    if actual_role != role and not (role == "client" and actual_role in ("client", "particulier")):
        warn_(f"rôle attendu={role}, retourné={actual_role} (peut être normal pour comptes démo)")

    # 2. Si rôle non autorisé à déposer : on s'arrête là (résultat attendu)
    if actual_role not in ROLES_CAN_DEPOSIT:
        info_(f"rôle '{actual_role}' n'a pas le droit de déposer — test du refus 403")
        ts = int(time.time() * 1000)
        ok, data = client.post_artwork({
            "title": f"[TEST {role}] doit echouer {ts}",
            "price": 100,
            "photos": [],
        })
        if not ok and "403" in data.get("error", ""):
            pass_(f"refus 403 confirmé pour rôle {actual_role}")
            result["steps"].append(("deposit_forbidden", "PASS", "403 attendu"))
        else:
            fail_(f"attendu 403, obtenu : {data}")
            result["steps"].append(("deposit_forbidden", "FAIL", str(data)))
            result["ok"] = False
        return result

    # 3. Upload photo principale
    ts = int(time.time())
    seed = abs(hash(role)) % 9999
    jpeg = make_jpeg(f"TEST {role.upper()}\n{ts}", seed=seed)
    ok, url_or_err = client.upload_photo(jpeg, f"test_{role}_{ts}.jpg")
    if ok:
        pass_(f"upload photo : {url_or_err[:80]}...")
        result["steps"].append(("upload", "PASS", url_or_err))
        photo_url = url_or_err
    else:
        fail_(f"upload photo : {url_or_err}")
        result["steps"].append(("upload", "FAIL", url_or_err))
        result["ok"] = False
        return result

    # 4. POST /api/artworks
    payload = {
        "title": f"[TEST {role}] Œuvre depot {ts}",
        "description": f"Œuvre déposée automatiquement par test-deposit-flow.py — rôle {role}",
        "technique": "Test technique",
        "dimensions": "30x40 cm",
        "creation_date": str(datetime.now().year),
        "category": "painting",
        "price": 250 + seed,
        "photos": [photo_url],
    }
    ok, data = client.post_artwork(payload)
    if ok:
        artwork_id = data.get("id")
        pass_(f"dépôt artwork : id={artwork_id[:8]}...")
        result["steps"].append(("deposit", "PASS", artwork_id))
        result["artwork_id"] = artwork_id

        # 4b. Fiche police pour rôles pros
        fp = data.get("fiche_police")
        if actual_role in ROLES_FICHE_POLICE:
            if fp and fp.get("triggered"):
                if fp.get("email_sent"):
                    pass_(f"fiche-police déclenchée + email envoyé "
                          f"(entry #{fp.get('entry_number')}, mode={fp.get('email_mode')}, "
                          f"to={fp.get('email_to')})")
                    result["steps"].append(("fiche_police", "PASS", str(fp)))
                else:
                    fail_(f"fiche-police déclenchée mais email NON envoyé : "
                          f"{fp.get('email_error')}")
                    result["steps"].append(("fiche_police_email", "FAIL", str(fp)))
                    result["ok"] = False
            else:
                reason = fp.get("reason") if fp else "fiche_police absent de la réponse"
                fail_(f"fiche-police NON déclenchée : {reason}")
                result["steps"].append(("fiche_police", "FAIL", str(fp)))
                result["ok"] = False
        else:
            if fp:
                warn_(f"fiche-police déclenchée pour rôle non-pro {actual_role} (inattendu) : {fp}")
            else:
                info_("pas de fiche-police (rôle non-pro, attendu)")
    else:
        fail_(f"dépôt artwork : {data.get('error')}")
        result["steps"].append(("deposit", "FAIL", str(data)))
        result["ok"] = False
        return result

    # 5. Vérification présence dans listing public
    time.sleep(2)  # laisse Supabase propager
    if client.find_artwork(artwork_id):
        pass_(f"œuvre visible dans GET /api/artworks")
        result["steps"].append(("visible", "PASS", ""))
    else:
        fail_(f"œuvre absente de GET /api/artworks (id {artwork_id[:8]} pas dans les 50 plus récents)")
        result["steps"].append(("visible", "FAIL", "absente du listing"))
        result["ok"] = False

    # 6. Test bonus certification pour artist + antiquaire
    if do_cert and role in ("artist", "antiquaire"):
        info_("test bonus certification pass-core (multipart + macro)")
        main = make_jpeg(f"CERT {role}\n{ts}", seed=seed + 1)
        macro1 = make_macro_jpeg(f"MACRO1 {role}", seed=seed + 2)
        macros = [
            make_macro_jpeg(f"MACRO2 {role}", seed=seed + 3),
            make_macro_jpeg(f"MACRO3 {role}", seed=seed + 4),
        ]
        cert_payload = {
            "title": f"[TEST CERT {role}] {ts}",
            "description": "Certification automatique",
            "technique": "Acrylique",
            "dimensions": "40x50 cm",
            "creation_date": str(datetime.now().year),
            "category": "painting",
            "price": "350",
            "macro_position": "haut-gauche",
            "macro_quality_score": "85",
            "email": email,
        }
        ok, data = client.certify(cert_payload, main, macro1, macros)
        if ok:
            pass_(f"certification réussie : id={str(data.get('id',''))[:8]}, "
                  f"photos uploadées={len(data.get('photos',[]))}, "
                  f"hash={str(data.get('blockchain_hash',''))[:16]}...")
            result["steps"].append(("certify", "PASS", str(data)[:200]))
        else:
            fail_(f"certification : {data.get('error')}")
            result["steps"].append(("certify", "FAIL", str(data)))
            result["ok"] = False

    client.logout()
    return result


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--base-art", default="https://art-core.app")
    p.add_argument("--base-pass", default="https://pass-core.app")
    p.add_argument("--local", action="store_true",
                   help="utilise http://localhost:3000 et :3001")
    p.add_argument("--only", help="ne tester qu'un seul rôle (artist, antiquaire, ...)")
    p.add_argument("--skip-cert", action="store_true",
                   help="saute le test bonus de certification")
    args = p.parse_args()

    if args.local:
        args.base_art = "http://localhost:3000"
        args.base_pass = "http://localhost:3001"

    print("================================================================")
    print("  test-deposit-flow.py - parcours depot par role")
    print("================================================================")
    print(f"  art-core  : {args.base_art}")
    print(f"  pass-core : {args.base_pass}")
    print(f"  certif    : {'OFF' if args.skip_cert else 'ON (artist + antiquaire)'}")

    if args.only:
        if args.only not in DEMO_ACCOUNTS:
            sys.exit(f"Rôle inconnu: {args.only}. Choix: {', '.join(DEMO_ACCOUNTS)}")
        roles = [args.only]
    else:
        roles = list(DEMO_ACCOUNTS.keys())

    results = []
    for role in roles:
        results.append(test_role(role, DEMO_ACCOUNTS[role],
                                 args.base_art, args.base_pass,
                                 do_cert=not args.skip_cert))

    # Resume
    print()
    print("=== RESUME ===")
    n_pass = sum(1 for r in results if r["ok"])
    n_fail = len(results) - n_pass
    for r in results:
        symbol = "[OK  ]" if r["ok"] else "[FAIL]"
        steps = ", ".join(f"{s[0]}={s[1]}" for s in r["steps"])
        print(f"  {symbol}  {r['role']:12} - {steps}")
    print()
    print(f"  Total : {n_pass}/{len(results)} roles PASS")
    if n_fail:
        print(f"  {n_fail} echec(s) - voir details ci-dessus.")

    sys.exit(0 if n_fail == 0 else 1)


if __name__ == "__main__":
    main()
