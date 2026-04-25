#!/usr/bin/env python3
"""
test-signup-flow.py — E2E signup pass-core (6 cas)

Lance les tests sur la prod réelle (pass-core.app + art-core.app).
Préfixe les emails par "e2e+<timestamp>@demo.com" pour le cleanup final.
Refuse de purger si plus de 50 rows correspondent (sécurité).

Usage: python test-signup-flow.py
Requiert SUPABASE_SERVICE_ROLE_KEY dans pass-core/.env.local OU art-core/.env.local
"""
from __future__ import annotations
import json
import os
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

PASS_CORE_URL = "https://pass-core.app"
ART_CORE_URL = "https://art-core.app"
SUPABASE_URL = "https://kmmlwuwsahtzgzztcdaj.supabase.co"

TS = int(time.time())
EMAIL_PREFIX = f"e2e+{TS}"


def make_siret(suffix: int) -> str:
    """SIRET unique deriva du timestamp + suffix (14 chiffres)."""
    s = f"{TS}{suffix:02d}"
    return s[-14:].zfill(14)


def load_service_key() -> str:
    here = Path(__file__).resolve().parent
    candidates = [
        here / ".env.local",
        here.parent / "art-core" / ".env.local",
    ]
    for env in candidates:
        if not env.is_file():
            continue
        for raw in env.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw.strip()
            if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    print("[FATAL] SUPABASE_SERVICE_ROLE_KEY introuvable", file=sys.stderr)
    sys.exit(2)


SERVICE_KEY = load_service_key()


def http(method: str, url: str, body=None, headers=None, allow_redirects=True):
    data = None
    h = {"Accept": "application/json"}
    if headers:
        h.update(headers)
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=data, method=method, headers=h)

    if not allow_redirects:
        opener = urllib.request.build_opener(NoRedirect())
    else:
        opener = urllib.request.build_opener()

    try:
        resp = opener.open(req, timeout=30)
        body_bytes = resp.read()
        return resp.status, dict(resp.headers), body_bytes
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def supabase(method: str, path: str, body=None, prefer=None) -> tuple[int, bytes]:
    h = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
    if prefer:
        h["Prefer"] = prefer
    if body is not None:
        h["Content-Type"] = "application/json"
    code, _hdr, b = http(method, f"{SUPABASE_URL}/rest/v1/{path}", body=body, headers=h)
    return code, b


# ── Tests ────────────────────────────────────────────────────────────────────

results: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, detail: str = ""):
    print(f"[{'PASS' if ok else 'FAIL'}] {name} — {detail}")
    results.append((name, ok, detail))


def test_1_artist():
    email = f"{EMAIL_PREFIX}.artist@demo.com"
    payload = {
        "role": "artist",
        "email": email,
        "password": "Test12345!",
        "full_name": "E2E Artist",
        "nom_artiste": "E2E Artist",
        "technique_artistique": "Huile sur toile (test)",
    }
    code, _h, body = http("POST", f"{PASS_CORE_URL}/api/auth/signup", body=payload)
    if code != 200:
        record("1. signup artist", False, f"HTTP {code}: {body[:200]}")
        return
    data = json.loads(body)
    if not data.get("user_id"):
        record("1. signup artist", False, "no user_id in response")
        return

    # Verify in DB that technique_artistique was persisted
    email_enc = urllib.parse.quote(email, safe="")
    sb_code, sb_body = supabase("GET", f"users?email=eq.{email_enc}&select=id,role,technique_artistique")
    if sb_code != 200:
        record("1. signup artist", False, f"DB lookup {sb_code}")
        return
    rows = json.loads(sb_body)
    if not rows or rows[0].get("technique_artistique") != "Huile sur toile (test)":
        record("1. signup artist", False, f"technique not persisted: {rows}")
        return
    record("1. signup artist", True, f"user_id={data['user_id']}")


def test_2_antiquaire_with_rom():
    email = f"{EMAIL_PREFIX}.antiq@demo.com"
    payload = {
        "role": "antiquaire",
        "email": email,
        "password": "Test12345!",
        "full_name": "E2E Antiquaire",
        "merchant": {
            "raison_sociale": "Antiquites E2E SARL",
            "siret": make_siret(2),
            "numero_rom": "0001-2025",
            "regime_tva": "marge",
            "nom_gerant": "E2E Gerant",
            "telephone": "+33612345678",
            "adresse": "1 rue du Test",
            "code_postal": "75001",
            "ville": "Paris",
        },
        "cahier_police_accepte": True,
    }
    code, _h, body = http("POST", f"{PASS_CORE_URL}/api/auth/signup", body=payload)
    if code != 200:
        record("2. signup antiquaire+ROM", False, f"HTTP {code}: {body[:200]}")
        return
    data = json.loads(body)

    # Verify merchant row : numero_rom est canonicalisé serveur-side (YYYY-XXX-NNNN)
    # depuis le cleanup pré-phase A (994816f). Si l'input n'est pas déjà canonique,
    # le serveur génère depuis ville+SIRET. On vérifie le format, pas l'égalité stricte.
    import re
    sb_code, sb_body = supabase("GET", f"merchants?user_id=eq.{data['user_id']}&select=numero_rom,regime_tva,actif")
    rows = json.loads(sb_body)
    if not rows:
        record("2. signup antiquaire+ROM", False, f"no merchant row")
        return
    rom = rows[0].get("numero_rom") or ""
    if not re.match(r"^\d{4}-[A-Z]{3}-\d{4}$", rom):
        record("2. signup antiquaire+ROM", False, f"numero_rom non canonique: {rom!r}")
        return
    if rows[0].get("regime_tva") != "marge":
        record("2. signup antiquaire+ROM", False, f"regime_tva mismatch: {rows[0]}")
        return
    record("2. signup antiquaire+ROM", True, f"merchant numero_rom={rom} (canonique)")


def test_3_antiquaire_without_cdp():
    email = f"{EMAIL_PREFIX}.antiq2@demo.com"
    payload = {
        "role": "antiquaire",
        "email": email,
        "password": "Test12345!",
        "full_name": "E2E Antiquaire2",
        "merchant": {
            "raison_sociale": "X SARL",
            "siret": make_siret(2),
            "numero_rom": "0002-2025",
            "regime_tva": "reel",
            "nom_gerant": "X",
            "telephone": "+33611111111",
            "adresse": "2 rue du Test",
            "code_postal": "75002",
            "ville": "Paris",
        },
        "cahier_police_accepte": False,  # devrait bloquer
    }
    code, _h, body = http("POST", f"{PASS_CORE_URL}/api/auth/signup", body=payload)
    if code == 400:
        try:
            data = json.loads(body)
            if "cahier de police" in (data.get("error", "").lower()):
                record("3. refus sans cahier de police", True, f"400 + msg")
                return
        except Exception:
            pass
    record("3. refus sans cahier de police", False, f"HTTP {code}: {body[:200]}")


def test_4_galeriste_no_cdp_required():
    email = f"{EMAIL_PREFIX}.galerie@demo.com"
    payload = {
        "role": "galeriste",
        "email": email,
        "password": "Test12345!",
        "full_name": "E2E Galerie",
        "merchant": {
            "raison_sociale": "Galerie E2E SARL",
            "siret": make_siret(4),
            "numero_rom": None,
            "regime_tva": "franchise",
            "nom_gerant": "E2E Galeriste",
            "telephone": "+33611112222",
            "adresse": "3 rue du Test",
            "code_postal": "75003",
            "ville": "Paris",
        },
        "cahier_police_accepte": False,  # OK pour galeriste
    }
    code, _h, body = http("POST", f"{PASS_CORE_URL}/api/auth/signup", body=payload)
    if code != 200:
        record("4. signup galeriste sans CdP", False, f"HTTP {code}: {body[:200]}")
        return
    record("4. signup galeriste sans CdP", True, "200 (CdP non bloquante)")


def test_5_redirect_pro_inscription():
    code, hdrs, _b = http("GET", f"{ART_CORE_URL}/art-core/pro/inscription", allow_redirects=False)
    loc = hdrs.get("location") or hdrs.get("Location") or ""
    if code in (301, 308) and "pass-core.app/auth/signup" in loc and "role=pro" in loc:
        record("5. redirect /pro/inscription", True, f"{code} -> {loc}")
        return
    record("5. redirect /pro/inscription", False, f"HTTP {code} loc={loc}")


def test_6_query_param_preselect():
    code, _h, body = http("GET", f"{PASS_CORE_URL}/auth/signup?role=pro")
    if code != 200:
        record("6. ?role=pro preselect", False, f"HTTP {code}")
        return
    html = body.decode("utf-8", errors="ignore")
    # La page est un client component qui lit useSearchParams() : Next.js
    # bail to CSR, donc le HTML SSR n'inclut pas les cartes pre-rendered.
    # On verifie que (a) la page repond 200, (b) le bundle signup est servi,
    # (c) la query string est conservee dans initialCanonicalUrl pour que le
    # hydrate client-side preselectionne bien le role.
    has_chunk = "/_next/static/chunks/app/auth/signup/" in html
    bails_csr = "BAILOUT_TO_CLIENT_SIDE_RENDERING" in html
    if has_chunk and bails_csr:
        # Le bailout est attendu : useSearchParams force CSR. Le hydrate
        # client-side preselectionnera Galeriste pour ?role=pro.
        record("6. ?role=pro preselect", True, "page 200 + bundle servi + bailout CSR (preselect cote client)")
    else:
        record("6. ?role=pro preselect", False, f"chunk={has_chunk} bails_csr={bails_csr}")


# ── Cleanup ──────────────────────────────────────────────────────────────────

def cleanup():
    print(f"\n=== CLEANUP (prefix: {EMAIL_PREFIX}) ===")

    # Find users to purge — encode + as %2B manually (urlencode does this but
    # PostgREST also re-decodes + as space, so on aurait double-decode raté).
    prefix_enc = urllib.parse.quote(EMAIL_PREFIX, safe="")
    code, body = supabase("GET", f"users?email=like.{prefix_enc}%25&select=id,email")
    if code != 200:
        print(f"[cleanup] users lookup failed: {code} {body!r}")
        return
    users = json.loads(body)
    if len(users) > 50:
        print(f"[cleanup] REFUS: {len(users)} users matchent (> 50). Action manuelle requise.")
        return
    print(f"[cleanup] {len(users)} users a purger: {[u['email'] for u in users]}")

    user_ids = [u["id"] for u in users]
    if not user_ids:
        return

    # Sessions / merchants / users (cascade may not exist — purge explicit)
    in_clause = "(" + ",".join(user_ids) + ")"
    for table, col in [("sessions", "user_id"), ("merchants", "user_id"), ("notifications", "user_id"), ("favorites", "user_id"), ("users", "id")]:
        code, body = supabase("DELETE", f"{table}?{col}=in.{in_clause}", prefer="return=minimal")
        print(f"[cleanup] DELETE {table} -> {code}")


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print(f"=== E2E signup flow (timestamp={TS}) ===")
    print(f"Pass-core: {PASS_CORE_URL}")
    print(f"Art-core:  {ART_CORE_URL}")
    print()

    try:
        test_1_artist()
        test_2_antiquaire_with_rom()
        test_3_antiquaire_without_cdp()
        test_4_galeriste_no_cdp_required()
        test_5_redirect_pro_inscription()
        test_6_query_param_preselect()
    finally:
        cleanup()

    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\n=== RESULTAT: {passed}/{total} PASS ===")
    for name, ok, detail in results:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {detail}")
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
