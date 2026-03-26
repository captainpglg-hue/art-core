// ═══════════════════════════════════════════════════════════════
// PASS-CORE — Specifications macro pour authentification
// ═══════════════════════════════════════════════════════════════
//
// OBJECTIF : capturer une zone de 10mm x 10mm (1cm²) sur l'oeuvre
// avec assez de details pour generer une empreinte SHA-256 unique.
//
// CRITERE CLE : au moins 50 pixels par millimetre (500x500 px
// pour couvrir la zone 10x10mm). Cela permet de voir les
// micro-details : coups de pinceau, grain de papier, fibres
// de toile, cristallisations, pores du bois, etc.
//
// ═══════════════════════════════════════════════════════════════

// ── Specs certification macro ───────────────────────────────
export const MACRO_SPECS = {
  // Zone a capturer sur l'oeuvre
  ZONE_SIZE_MM: 10,              // 10mm x 10mm = 1cm²

  // Densite minimum pour authentification
  MIN_PIXELS_PER_MM: 50,         // 50 px/mm minimum
  IDEAL_PIXELS_PER_MM: 100,      // 100 px/mm ideal
  // → Zone 10mm : min 500x500px, ideal 1000x1000px

  // Resolution minimum de la camera
  MIN_MEGAPIXELS: 8,             // 8MP minimum
  IDEAL_MEGAPIXELS: 12,          // 12MP+ ideal

  // Distance de mise au point
  MAX_FOCUS_DISTANCE_MM: 50,     // 5cm max sans kit
  IDEAL_FOCUS_DISTANCE_MM: 30,   // 3cm ideal sans kit
  WITH_KIT_FOCUS_DISTANCE_MM: 15,// 1.5cm avec kit clip macro

  // Qualite d'image
  MIN_QUALITY_SCORE: 60,         // Score global minimum 0-100
  MIN_SHARPNESS_VARIANCE: 150,   // Variance Laplacienne minimum
  MIN_BRIGHTNESS: 50,
  MAX_BRIGHTNESS: 210,
  MAX_REFLECTION_PCT: 0.05,      // Max 5% pixels surexposes

  // Auto-capture : frames consecutives au-dessus du seuil
  AUTO_CAPTURE_STREAK: 8,        // 8 frames = ~1.6 secondes
} as const;

// ── Grades ──────────────────────────────────────────────────
export type CameraGrade = "A" | "B" | "C" | "D";

export function getCameraGrade(widthPx: number, heightPx: number): CameraGrade {
  const mp = (widthPx * heightPx) / 1_000_000;
  if (mp >= 12) return "A";
  if (mp >= 8) return "B";
  if (mp >= 4) return "C";
  return "D";
}

// ═══════════════════════════════════════════════════════════════
// BASE COMPLETE DES SMARTPHONES COMPATIBLES
// ═══════════════════════════════════════════════════════════════
//
// Grade A : Macro sans kit — capteur >= 50MP ou mode macro dedie
//           Distance mise au point <= 4cm natif
//
// Grade B : Macro possible sans kit — capteur >= 12MP
//           Mise au point rapprochee correcte
//
// Grade C : Kit macro recommande — capteur >= 8MP
//           Pas de mise au point rapprochee native
//
// Grade D : Non compatible — capteur < 8MP ou pas d'autofocus
//
// ═══════════════════════════════════════════════════════════════

interface PhoneEntry {
  pattern: RegExp;
  brand: string;
  model: string;
  mainCamera: string;
  macroType: "dedicated" | "ultra-wide" | "main-crop" | "basic" | "none";
  minFocusMM: number; // distance min mise au point en mm
  grade: CameraGrade;
  note: string;
}

export const PHONE_DATABASE: PhoneEntry[] = [

  // ══════════════════════════════════════
  // XIAOMI / REDMI / POCO
  // ══════════════════════════════════════

  // 2025-2026
  { pattern: /2410fpn4dg|xiaomi 15t pro|xiaomi 15 ultra/i, brand: "Xiaomi", model: "15T Pro / 15 Ultra", mainCamera: "200MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "200MP Samsung HP9 — crop macro ultra detaille" },
  { pattern: /xiaomi 15t|xiaomi 15\b/i, brand: "Xiaomi", model: "15T / 15", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "50MP Leica avec macro" },
  { pattern: /xiaomi 14 ultra/i, brand: "Xiaomi", model: "14 Ultra", mainCamera: "50MP Leica", macroType: "dedicated", minFocusMM: 20, grade: "A", note: "Objectif Leica Summilux — macro dedie" },
  { pattern: /xiaomi 14 pro/i, brand: "Xiaomi", model: "14 Pro", mainCamera: "50MP Leica", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP Leica — excellent" },
  { pattern: /xiaomi 14t pro|2407fnk/i, brand: "Xiaomi", model: "14T Pro", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP MediaTek ISP — tres bon" },
  { pattern: /xiaomi 14t\b/i, brand: "Xiaomi", model: "14T", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "50MP avec macro" },
  { pattern: /xiaomi 14\b/i, brand: "Xiaomi", model: "14", mainCamera: "50MP Leica", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP Leica" },

  // 2023-2024
  { pattern: /xiaomi 13t pro|2306epc/i, brand: "Xiaomi", model: "13T Pro", mainCamera: "200MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "200MP Samsung ISOCELL — crop macro" },
  { pattern: /xiaomi 13t\b/i, brand: "Xiaomi", model: "13T", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "50MP Sony IMX" },
  { pattern: /xiaomi 13 ultra/i, brand: "Xiaomi", model: "13 Ultra", mainCamera: "50MP Leica", macroType: "dedicated", minFocusMM: 20, grade: "A", note: "Leica macro dedie" },
  { pattern: /xiaomi 13 pro/i, brand: "Xiaomi", model: "13 Pro", mainCamera: "50MP Leica", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP 1 pouce Leica" },
  { pattern: /xiaomi 13\b/i, brand: "Xiaomi", model: "13", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "50MP Sony IMX800" },
  { pattern: /xiaomi 12t pro/i, brand: "Xiaomi", model: "12T Pro", mainCamera: "200MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "200MP Samsung HP1" },
  { pattern: /xiaomi 12 pro/i, brand: "Xiaomi", model: "12 Pro", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "50MP Sony IMX707" },
  { pattern: /xiaomi 12\b/i, brand: "Xiaomi", model: "12", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 40, grade: "B", note: "50MP Sony" },

  // Redmi Note series
  { pattern: /redmi note 13 pro\+|2312draa/i, brand: "Xiaomi", model: "Redmi Note 13 Pro+", mainCamera: "200MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "200MP Samsung HP3 — excellent crop macro" },
  { pattern: /redmi note 13 pro\b/i, brand: "Xiaomi", model: "Redmi Note 13 Pro", mainCamera: "200MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "200MP crop macro" },
  { pattern: /redmi note 13\b/i, brand: "Xiaomi", model: "Redmi Note 13", mainCamera: "108MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "108MP — macro par crop" },
  { pattern: /redmi note 12 pro\+/i, brand: "Xiaomi", model: "Redmi Note 12 Pro+", mainCamera: "200MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "200MP Samsung HP1" },
  { pattern: /redmi note 12 pro/i, brand: "Xiaomi", model: "Redmi Note 12 Pro", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 25, grade: "B", note: "50MP + macro 2MP dedie" },
  { pattern: /redmi note 12\b/i, brand: "Xiaomi", model: "Redmi Note 12", mainCamera: "50MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "50MP basique" },
  { pattern: /redmi note 11 pro\+/i, brand: "Xiaomi", model: "Redmi Note 11 Pro+", mainCamera: "108MP", macroType: "dedicated", minFocusMM: 30, grade: "B", note: "108MP + macro 2MP" },
  { pattern: /redmi note 11 pro/i, brand: "Xiaomi", model: "Redmi Note 11 Pro", mainCamera: "108MP", macroType: "dedicated", minFocusMM: 30, grade: "B", note: "108MP + macro 2MP" },
  { pattern: /redmi note 11\b/i, brand: "Xiaomi", model: "Redmi Note 11", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP + macro 2MP" },
  { pattern: /redmi note 10 pro/i, brand: "Xiaomi", model: "Redmi Note 10 Pro", mainCamera: "108MP", macroType: "dedicated", minFocusMM: 30, grade: "B", note: "108MP + macro 5MP" },

  // Redmi standard
  { pattern: /redmi 13c|redmi 13\b/i, brand: "Xiaomi", model: "Redmi 13", mainCamera: "50MP", macroType: "basic", minFocusMM: 50, grade: "C", note: "50MP basique — kit recommande" },
  { pattern: /redmi 12\b/i, brand: "Xiaomi", model: "Redmi 12", mainCamera: "50MP", macroType: "basic", minFocusMM: 50, grade: "C", note: "50MP — kit recommande" },
  { pattern: /redmi a3|redmi a2|redmi a1/i, brand: "Xiaomi", model: "Redmi A series", mainCamera: "8MP", macroType: "none", minFocusMM: 80, grade: "D", note: "Capteur insuffisant — kit obligatoire" },

  // POCO
  { pattern: /poco f6 pro|24069pc/i, brand: "Xiaomi", model: "POCO F6 Pro", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "50MP OIS — tres bon" },
  { pattern: /poco f6\b/i, brand: "Xiaomi", model: "POCO F6", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "B", note: "50MP Sony" },
  { pattern: /poco f5 pro/i, brand: "Xiaomi", model: "POCO F5 Pro", mainCamera: "64MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "64MP OmniVision" },
  { pattern: /poco f5\b/i, brand: "Xiaomi", model: "POCO F5", mainCamera: "64MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "64MP" },
  { pattern: /poco x6 pro/i, brand: "Xiaomi", model: "POCO X6 Pro", mainCamera: "64MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "64MP" },
  { pattern: /poco x5 pro/i, brand: "Xiaomi", model: "POCO X5 Pro", mainCamera: "108MP", macroType: "dedicated", minFocusMM: 30, grade: "B", note: "108MP + macro 2MP" },
  { pattern: /poco m6 pro/i, brand: "Xiaomi", model: "POCO M6 Pro", mainCamera: "64MP", macroType: "basic", minFocusMM: 45, grade: "B", note: "64MP" },
  { pattern: /poco c65|poco c55|poco c51/i, brand: "Xiaomi", model: "POCO C series", mainCamera: "13MP", macroType: "none", minFocusMM: 70, grade: "D", note: "Capteur insuffisant" },

  // Fallback Xiaomi
  { pattern: /xiaomi|redmi|poco|miui/i, brand: "Xiaomi", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 40, grade: "B", note: "Xiaomi detecte — qualite verifiee en temps reel" },

  // ══════════════════════════════════════
  // SAMSUNG
  // ══════════════════════════════════════

  // Galaxy S series 2024-2026
  { pattern: /sm-s928|galaxy s24 ultra/i, brand: "Samsung", model: "Galaxy S24 Ultra", mainCamera: "200MP", macroType: "main-crop", minFocusMM: 25, grade: "A", note: "200MP Samsung HP2 — meilleur Android pour macro" },
  { pattern: /sm-s926|galaxy s24\+/i, brand: "Samsung", model: "Galaxy S24+", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP ISOCELL GN3 — mode macro" },
  { pattern: /sm-s921|galaxy s24\b/i, brand: "Samsung", model: "Galaxy S24", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "50MP" },
  { pattern: /sm-s918|galaxy s23 ultra/i, brand: "Samsung", model: "Galaxy S23 Ultra", mainCamera: "200MP", macroType: "main-crop", minFocusMM: 25, grade: "A", note: "200MP HP2 — excellent crop macro" },
  { pattern: /sm-s916|galaxy s23\+/i, brand: "Samsung", model: "Galaxy S23+", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP GN3" },
  { pattern: /sm-s911|galaxy s23\b/i, brand: "Samsung", model: "Galaxy S23", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "50MP" },
  { pattern: /sm-s908|galaxy s22 ultra/i, brand: "Samsung", model: "Galaxy S22 Ultra", mainCamera: "108MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "108MP crop macro" },
  { pattern: /sm-s906|galaxy s22\+/i, brand: "Samsung", model: "Galaxy S22+", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "B", note: "50MP" },
  { pattern: /sm-s901|galaxy s22\b/i, brand: "Samsung", model: "Galaxy S22", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "B", note: "50MP" },
  { pattern: /sm-g998|galaxy s21 ultra/i, brand: "Samsung", model: "Galaxy S21 Ultra", mainCamera: "108MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "108MP macro crop" },
  { pattern: /sm-g99[16]|galaxy s21/i, brand: "Samsung", model: "Galaxy S21/S21+", mainCamera: "12MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "12MP — correct" },

  // Galaxy A series
  { pattern: /sm-a556|galaxy a55/i, brand: "Samsung", model: "Galaxy A55", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 30, grade: "B", note: "50MP OIS + macro 5MP" },
  { pattern: /sm-a546|galaxy a54/i, brand: "Samsung", model: "Galaxy A54", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 30, grade: "B", note: "50MP OIS + macro 5MP" },
  { pattern: /sm-a536|galaxy a53/i, brand: "Samsung", model: "Galaxy A53", mainCamera: "64MP", macroType: "dedicated", minFocusMM: 30, grade: "B", note: "64MP + macro 5MP" },
  { pattern: /sm-a356|galaxy a35/i, brand: "Samsung", model: "Galaxy A35", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 30, grade: "B", note: "50MP + macro 5MP" },
  { pattern: /sm-a346|galaxy a34/i, brand: "Samsung", model: "Galaxy A34", mainCamera: "48MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "48MP + macro 5MP" },
  { pattern: /sm-a256|galaxy a25/i, brand: "Samsung", model: "Galaxy A25", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP + macro 2MP" },
  { pattern: /sm-a156|galaxy a15/i, brand: "Samsung", model: "Galaxy A15", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 40, grade: "C", note: "50MP + macro 2MP — qualite moyenne" },
  { pattern: /sm-a146|galaxy a14/i, brand: "Samsung", model: "Galaxy A14", mainCamera: "50MP", macroType: "basic", minFocusMM: 50, grade: "C", note: "50MP sans AF macro — kit recommande" },
  { pattern: /sm-a057|galaxy a05s/i, brand: "Samsung", model: "Galaxy A05s", mainCamera: "50MP", macroType: "none", minFocusMM: 60, grade: "D", note: "Pas d'autofocus macro" },

  // Galaxy M series
  { pattern: /sm-m546|galaxy m54/i, brand: "Samsung", model: "Galaxy M54", mainCamera: "108MP", macroType: "dedicated", minFocusMM: 30, grade: "B", note: "108MP + macro 2MP" },
  { pattern: /sm-m346|galaxy m34/i, brand: "Samsung", model: "Galaxy M34", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP + macro" },
  { pattern: /sm-m146|galaxy m14/i, brand: "Samsung", model: "Galaxy M14", mainCamera: "50MP", macroType: "basic", minFocusMM: 50, grade: "C", note: "Kit recommande" },

  // Fallback Samsung
  { pattern: /samsung|sm-[a-z]/i, brand: "Samsung", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 40, grade: "B", note: "Samsung detecte — qualite verifiee en temps reel" },

  // ══════════════════════════════════════
  // APPLE iPHONE
  // ══════════════════════════════════════
  // Mode macro natif depuis iPhone 13 Pro (via ultra-grand-angle)
  // Mise au point a 2cm

  { pattern: /iphone.*16.*pro max/i, brand: "Apple", model: "iPhone 16 Pro Max", mainCamera: "48MP", macroType: "ultra-wide", minFocusMM: 20, grade: "A", note: "Mode macro dedie — 2cm" },
  { pattern: /iphone.*16.*pro/i, brand: "Apple", model: "iPhone 16 Pro", mainCamera: "48MP", macroType: "ultra-wide", minFocusMM: 20, grade: "A", note: "Mode macro dedie — 2cm" },
  { pattern: /iphone.*16/i, brand: "Apple", model: "iPhone 16", mainCamera: "48MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "48MP sans macro dedie" },
  { pattern: /iphone.*15.*pro max/i, brand: "Apple", model: "iPhone 15 Pro Max", mainCamera: "48MP", macroType: "ultra-wide", minFocusMM: 20, grade: "A", note: "Mode macro automatique — 2cm" },
  { pattern: /iphone.*15.*pro/i, brand: "Apple", model: "iPhone 15 Pro", mainCamera: "48MP", macroType: "ultra-wide", minFocusMM: 20, grade: "A", note: "Mode macro — 2cm" },
  { pattern: /iphone.*15/i, brand: "Apple", model: "iPhone 15", mainCamera: "48MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "48MP sans macro" },
  { pattern: /iphone.*14.*pro/i, brand: "Apple", model: "iPhone 14 Pro", mainCamera: "48MP", macroType: "ultra-wide", minFocusMM: 20, grade: "A", note: "Mode macro — 2cm" },
  { pattern: /iphone.*14/i, brand: "Apple", model: "iPhone 14", mainCamera: "12MP", macroType: "basic", minFocusMM: 50, grade: "C", note: "12MP sans macro — kit recommande" },
  { pattern: /iphone.*13.*pro/i, brand: "Apple", model: "iPhone 13 Pro", mainCamera: "12MP", macroType: "ultra-wide", minFocusMM: 20, grade: "B", note: "Premier iPhone avec macro" },
  { pattern: /iphone.*13/i, brand: "Apple", model: "iPhone 13", mainCamera: "12MP", macroType: "basic", minFocusMM: 50, grade: "C", note: "12MP sans macro — kit recommande" },
  { pattern: /iphone.*12.*pro/i, brand: "Apple", model: "iPhone 12 Pro", mainCamera: "12MP", macroType: "basic", minFocusMM: 50, grade: "C", note: "Pas de mode macro — kit recommande" },
  { pattern: /iphone.*12/i, brand: "Apple", model: "iPhone 12", mainCamera: "12MP", macroType: "basic", minFocusMM: 60, grade: "C", note: "Kit macro obligatoire" },
  { pattern: /iphone.*11/i, brand: "Apple", model: "iPhone 11", mainCamera: "12MP", macroType: "none", minFocusMM: 70, grade: "D", note: "Trop ancien — kit obligatoire" },
  { pattern: /iphone/i, brand: "Apple", model: "iPhone (ancien)", mainCamera: "?", macroType: "none", minFocusMM: 80, grade: "D", note: "iPhone trop ancien" },

  // ══════════════════════════════════════
  // GOOGLE PIXEL
  // ══════════════════════════════════════

  { pattern: /pixel 9 pro xl/i, brand: "Google", model: "Pixel 9 Pro XL", mainCamera: "50MP", macroType: "ultra-wide", minFocusMM: 20, grade: "A", note: "Macro Focus IA — excellent" },
  { pattern: /pixel 9 pro/i, brand: "Google", model: "Pixel 9 Pro", mainCamera: "50MP", macroType: "ultra-wide", minFocusMM: 20, grade: "A", note: "Macro Focus IA" },
  { pattern: /pixel 9\b/i, brand: "Google", model: "Pixel 9", mainCamera: "50MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "50MP sans macro dedie" },
  { pattern: /pixel 8 pro/i, brand: "Google", model: "Pixel 8 Pro", mainCamera: "50MP", macroType: "ultra-wide", minFocusMM: 20, grade: "A", note: "Mode macro automatique" },
  { pattern: /pixel 8a/i, brand: "Google", model: "Pixel 8a", mainCamera: "64MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "64MP" },
  { pattern: /pixel 8\b/i, brand: "Google", model: "Pixel 8", mainCamera: "50MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "50MP" },
  { pattern: /pixel 7 pro/i, brand: "Google", model: "Pixel 7 Pro", mainCamera: "50MP", macroType: "ultra-wide", minFocusMM: 25, grade: "B", note: "Macro via ultra-grand-angle" },
  { pattern: /pixel 7a/i, brand: "Google", model: "Pixel 7a", mainCamera: "64MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "64MP" },
  { pattern: /pixel 7\b/i, brand: "Google", model: "Pixel 7", mainCamera: "50MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "50MP" },
  { pattern: /pixel 6 pro/i, brand: "Google", model: "Pixel 6 Pro", mainCamera: "50MP", macroType: "basic", minFocusMM: 45, grade: "B", note: "50MP" },
  { pattern: /pixel 6a/i, brand: "Google", model: "Pixel 6a", mainCamera: "12MP", macroType: "none", minFocusMM: 60, grade: "C", note: "Kit recommande" },
  { pattern: /pixel/i, brand: "Google", model: "Pixel (ancien)", mainCamera: "?", macroType: "basic", minFocusMM: 50, grade: "C", note: "Kit recommande" },

  // ══════════════════════════════════════
  // ONEPLUS
  // ══════════════════════════════════════

  { pattern: /oneplus 12/i, brand: "OnePlus", model: "12", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 20, grade: "A", note: "Hasselblad + macro dedie" },
  { pattern: /oneplus 11/i, brand: "OnePlus", model: "11", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP Hasselblad" },
  { pattern: /oneplus nord 4/i, brand: "OnePlus", model: "Nord 4", mainCamera: "50MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "50MP Sony" },
  { pattern: /oneplus nord 3/i, brand: "OnePlus", model: "Nord 3", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 30, grade: "B", note: "50MP + macro 2MP" },
  { pattern: /oneplus nord ce 3/i, brand: "OnePlus", model: "Nord CE 3", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP + macro 2MP" },
  { pattern: /oneplus 10 pro/i, brand: "OnePlus", model: "10 Pro", mainCamera: "48MP", macroType: "main-crop", minFocusMM: 30, grade: "B", note: "48MP Hasselblad" },
  { pattern: /oneplus/i, brand: "OnePlus", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 40, grade: "B", note: "OnePlus detecte" },

  // ══════════════════════════════════════
  // OPPO
  // ══════════════════════════════════════

  { pattern: /oppo find x7 ultra/i, brand: "Oppo", model: "Find X7 Ultra", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 20, grade: "A", note: "Double periscope + macro" },
  { pattern: /oppo find x7/i, brand: "Oppo", model: "Find X7", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP Hasselblad" },
  { pattern: /oppo find x6 pro/i, brand: "Oppo", model: "Find X6 Pro", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP MariSilicon" },
  { pattern: /oppo reno 12 pro/i, brand: "Oppo", model: "Reno 12 Pro", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 30, grade: "B", note: "50MP + macro 2MP" },
  { pattern: /oppo reno 11/i, brand: "Oppo", model: "Reno 11", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP + macro" },
  { pattern: /oppo reno 10/i, brand: "Oppo", model: "Reno 10", mainCamera: "64MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "64MP + macro 2MP" },
  { pattern: /oppo a79|oppo a78|oppo a58/i, brand: "Oppo", model: "Oppo A series", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP + macro 2MP" },
  { pattern: /oppo a38|oppo a18|oppo a17/i, brand: "Oppo", model: "Oppo A entree gamme", mainCamera: "50MP", macroType: "basic", minFocusMM: 50, grade: "C", note: "Kit recommande" },
  { pattern: /oppo/i, brand: "Oppo", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 40, grade: "B", note: "Oppo detecte" },

  // ══════════════════════════════════════
  // HONOR
  // ══════════════════════════════════════

  { pattern: /honor magic6 pro/i, brand: "Honor", model: "Magic6 Pro", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 20, grade: "A", note: "50MP + macro IA" },
  { pattern: /honor magic5 pro/i, brand: "Honor", model: "Magic5 Pro", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 25, grade: "A", note: "50MP + macro" },
  { pattern: /honor 200 pro/i, brand: "Honor", model: "200 Pro", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP Studio Harcourt" },
  { pattern: /honor 200\b/i, brand: "Honor", model: "200", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "B", note: "50MP" },
  { pattern: /honor 90/i, brand: "Honor", model: "90", mainCamera: "200MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "200MP crop macro" },
  { pattern: /honor x9b|honor x8b/i, brand: "Honor", model: "X9b/X8b", mainCamera: "108MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "108MP + macro 2MP" },
  { pattern: /honor/i, brand: "Honor", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 40, grade: "B", note: "Honor detecte" },

  // ══════════════════════════════════════
  // HUAWEI
  // ══════════════════════════════════════

  { pattern: /huawei p60 pro/i, brand: "Huawei", model: "P60 Pro", mainCamera: "48MP", macroType: "dedicated", minFocusMM: 25, grade: "A", note: "XMAGE + macro dedie" },
  { pattern: /huawei mate 60 pro/i, brand: "Huawei", model: "Mate 60 Pro", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 25, grade: "A", note: "50MP XMAGE macro" },
  { pattern: /huawei p50 pro/i, brand: "Huawei", model: "P50 Pro", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP True-Chroma" },
  { pattern: /huawei nova 12/i, brand: "Huawei", model: "Nova 12", mainCamera: "50MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "50MP" },
  { pattern: /huawei/i, brand: "Huawei", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 40, grade: "B", note: "Huawei detecte" },

  // ══════════════════════════════════════
  // REALME
  // ══════════════════════════════════════

  { pattern: /realme gt 5 pro|realme gt5 pro/i, brand: "Realme", model: "GT 5 Pro", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP Sony LYT-808" },
  { pattern: /realme gt neo 5/i, brand: "Realme", model: "GT Neo 5", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "B", note: "50MP Sony" },
  { pattern: /realme 12 pro\+/i, brand: "Realme", model: "12 Pro+", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP Sony periscope" },
  { pattern: /realme 12 pro/i, brand: "Realme", model: "12 Pro", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "B", note: "50MP Sony" },
  { pattern: /realme 11 pro\+/i, brand: "Realme", model: "11 Pro+", mainCamera: "200MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "200MP Samsung HP3" },
  { pattern: /realme 11 pro/i, brand: "Realme", model: "11 Pro", mainCamera: "100MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "100MP Samsung HM6" },
  { pattern: /realme narzo 70 pro/i, brand: "Realme", model: "Narzo 70 Pro", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP + macro 2MP" },
  { pattern: /realme c67|realme c55|realme c53/i, brand: "Realme", model: "Realme C series", mainCamera: "50MP", macroType: "basic", minFocusMM: 50, grade: "C", note: "Kit recommande" },
  { pattern: /realme/i, brand: "Realme", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 40, grade: "B", note: "Realme detecte" },

  // ══════════════════════════════════════
  // VIVO
  // ══════════════════════════════════════

  { pattern: /vivo x100 pro/i, brand: "Vivo", model: "X100 Pro", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 20, grade: "A", note: "50MP ZEISS + macro dedie" },
  { pattern: /vivo x100\b/i, brand: "Vivo", model: "X100", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "50MP ZEISS" },
  { pattern: /vivo x90 pro/i, brand: "Vivo", model: "X90 Pro", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 20, grade: "A", note: "50MP ZEISS macro" },
  { pattern: /vivo v30 pro/i, brand: "Vivo", model: "V30 Pro", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "B", note: "50MP ZEISS" },
  { pattern: /vivo v29/i, brand: "Vivo", model: "V29", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP + macro" },
  { pattern: /vivo y200|vivo y100/i, brand: "Vivo", model: "Vivo Y series", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP + macro 2MP" },
  { pattern: /vivo y36|vivo y27|vivo y17/i, brand: "Vivo", model: "Vivo Y entree gamme", mainCamera: "50MP", macroType: "basic", minFocusMM: 50, grade: "C", note: "Kit recommande" },
  { pattern: /vivo/i, brand: "Vivo", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 40, grade: "B", note: "Vivo detecte" },

  // ══════════════════════════════════════
  // MOTOROLA
  // ══════════════════════════════════════

  { pattern: /motorola edge 50 ultra/i, brand: "Motorola", model: "Edge 50 Ultra", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 25, grade: "A", note: "50MP + macro dedie" },
  { pattern: /motorola edge 50 pro/i, brand: "Motorola", model: "Edge 50 Pro", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 30, grade: "A", note: "50MP + macro" },
  { pattern: /motorola edge 40 pro/i, brand: "Motorola", model: "Edge 40 Pro", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 30, grade: "A", note: "50MP macro" },
  { pattern: /moto g84|moto g73|moto g54/i, brand: "Motorola", model: "Moto G series", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP + macro 2MP" },
  { pattern: /moto g34|moto g24|moto g14/i, brand: "Motorola", model: "Moto G entree gamme", mainCamera: "50MP", macroType: "basic", minFocusMM: 50, grade: "C", note: "Kit recommande" },
  { pattern: /motorola|moto/i, brand: "Motorola", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 40, grade: "B", note: "Motorola detecte" },

  // ══════════════════════════════════════
  // NOTHING
  // ══════════════════════════════════════

  { pattern: /nothing phone.*2a/i, brand: "Nothing", model: "Phone (2a)", mainCamera: "50MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "50MP Sony" },
  { pattern: /nothing phone.*2/i, brand: "Nothing", model: "Phone (2)", mainCamera: "50MP", macroType: "basic", minFocusMM: 35, grade: "B", note: "50MP Sony IMX890" },
  { pattern: /nothing phone.*1/i, brand: "Nothing", model: "Phone (1)", mainCamera: "50MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "50MP Sony" },
  { pattern: /nothing/i, brand: "Nothing", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 40, grade: "B", note: "Nothing detecte" },

  // ══════════════════════════════════════
  // NOKIA
  // ══════════════════════════════════════

  { pattern: /nokia x30/i, brand: "Nokia", model: "X30", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP ZEISS + macro 2MP" },
  { pattern: /nokia g60|nokia g42/i, brand: "Nokia", model: "Nokia G series", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP + macro 2MP" },
  { pattern: /nokia/i, brand: "Nokia", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 45, grade: "C", note: "Nokia detecte — kit recommande" },

  // ══════════════════════════════════════
  // SONY XPERIA
  // ══════════════════════════════════════

  { pattern: /xperia 1 vi|xperia 1 v/i, brand: "Sony", model: "Xperia 1 V/VI", mainCamera: "52MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "52MP Exmor T — optique pro" },
  { pattern: /xperia 5 v/i, brand: "Sony", model: "Xperia 5 V", mainCamera: "52MP", macroType: "main-crop", minFocusMM: 30, grade: "A", note: "52MP Exmor T" },
  { pattern: /xperia 10 v/i, brand: "Sony", model: "Xperia 10 V", mainCamera: "48MP", macroType: "basic", minFocusMM: 40, grade: "B", note: "48MP" },
  { pattern: /xperia/i, brand: "Sony", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 40, grade: "B", note: "Sony detecte" },

  // ══════════════════════════════════════
  // ASUS
  // ══════════════════════════════════════

  { pattern: /rog phone 8 pro/i, brand: "Asus", model: "ROG Phone 8 Pro", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "50MP Sony IMX890" },
  { pattern: /zenfone 11/i, brand: "Asus", model: "Zenfone 11", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "A", note: "50MP" },
  { pattern: /zenfone 10/i, brand: "Asus", model: "Zenfone 10", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "B", note: "50MP Sony" },
  { pattern: /asus/i, brand: "Asus", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 40, grade: "B", note: "Asus detecte" },

  // ══════════════════════════════════════
  // TECNO / INFINIX / ITEL (Transsion)
  // ══════════════════════════════════════

  { pattern: /tecno camon 30 pro/i, brand: "Tecno", model: "Camon 30 Pro", mainCamera: "50MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "50MP + macro" },
  { pattern: /tecno camon 20 pro/i, brand: "Tecno", model: "Camon 20 Pro", mainCamera: "64MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "64MP + macro" },
  { pattern: /tecno phantom v/i, brand: "Tecno", model: "Phantom V", mainCamera: "50MP", macroType: "main-crop", minFocusMM: 35, grade: "B", note: "50MP" },
  { pattern: /tecno spark|tecno pop/i, brand: "Tecno", model: "Spark/Pop series", mainCamera: "13MP", macroType: "none", minFocusMM: 70, grade: "D", note: "Non compatible" },
  { pattern: /tecno/i, brand: "Tecno", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 45, grade: "C", note: "Kit recommande" },

  { pattern: /infinix note 40 pro/i, brand: "Infinix", model: "Note 40 Pro", mainCamera: "108MP", macroType: "dedicated", minFocusMM: 35, grade: "B", note: "108MP + macro" },
  { pattern: /infinix gt 20 pro/i, brand: "Infinix", model: "GT 20 Pro", mainCamera: "108MP", macroType: "main-crop", minFocusMM: 35, grade: "B", note: "108MP" },
  { pattern: /infinix hot|infinix smart/i, brand: "Infinix", model: "Hot/Smart series", mainCamera: "13MP", macroType: "none", minFocusMM: 70, grade: "D", note: "Non compatible" },
  { pattern: /infinix/i, brand: "Infinix", model: "(modele non identifie)", mainCamera: "?", macroType: "basic", minFocusMM: 45, grade: "C", note: "Kit recommande" },

  { pattern: /itel/i, brand: "Itel", model: "(modele non identifie)", mainCamera: "?", macroType: "none", minFocusMM: 70, grade: "D", note: "Non compatible — kit obligatoire" },
];

// ── Detection automatique ───────────────────────────────────
export function detectPhone(userAgent: string): {
  detected: boolean;
  compatible: boolean;
  grade: CameraGrade;
  brand: string;
  model: string;
  mainCamera: string;
  macroType: string;
  minFocusMM: number;
  note: string;
  needsKit: boolean;
} {
  const ua = userAgent;

  for (const phone of PHONE_DATABASE) {
    if (phone.pattern.test(ua)) {
      return {
        detected: true,
        compatible: phone.grade !== "D",
        grade: phone.grade,
        brand: phone.brand,
        model: phone.model,
        mainCamera: phone.mainCamera,
        macroType: phone.macroType,
        minFocusMM: phone.minFocusMM,
        note: phone.note,
        needsKit: phone.grade === "C" || phone.grade === "D",
      };
    }
  }

  // Android generique
  if (/android/i.test(ua)) {
    return {
      detected: false,
      compatible: true,
      grade: "C",
      brand: "Android",
      model: "Telephone non identifie",
      mainCamera: "?",
      macroType: "basic",
      minFocusMM: 50,
      note: "Appareil non reconnu — qualite verifiee en temps reel. Kit macro recommande.",
      needsKit: true,
    };
  }

  // Desktop ou autre
  return {
    detected: false,
    compatible: false,
    grade: "D",
    brand: "Inconnu",
    model: "Non mobile",
    mainCamera: "N/A",
    macroType: "none",
    minFocusMM: 999,
    note: "Utilisez un smartphone pour certifier",
    needsKit: true,
  };
}

// ── Stats ───────────────────────────────────────────────────
export const PHONE_STATS = {
  total: PHONE_DATABASE.length,
  gradeA: PHONE_DATABASE.filter(p => p.grade === "A").length,
  gradeB: PHONE_DATABASE.filter(p => p.grade === "B").length,
  gradeC: PHONE_DATABASE.filter(p => p.grade === "C").length,
  gradeD: PHONE_DATABASE.filter(p => p.grade === "D").length,
  brands: Array.from(new Set(PHONE_DATABASE.map(p => p.brand))).length,
};
