import sharp from "sharp";
import crypto from "crypto";

/**
 * Génère une empreinte visuelle (fingerprint) à partir d'une photo macro.
 *
 * Méthode : Average Hash (aHash) + Difference Hash (dHash)
 * 1. Redimensionner en 16x16 niveaux de gris
 * 2. Calculer le hash moyen (pixels > moyenne = 1, sinon = 0)
 * 3. Calculer le hash différentiel (pixel > voisin droite = 1)
 * 4. Combiner les deux en un fingerprint 512 bits
 *
 * Ce fingerprint est DÉTERMINISTE : même image → même hash.
 * Images similaires → hashes proches (distance de Hamming faible).
 */

export interface FingerprintResult {
  aHash: string;        // Average hash (256 bits hex)
  dHash: string;        // Difference hash (240 bits hex)
  combined: string;     // SHA-256 du aHash+dHash (pour la blockchain)
  similarity_hash: string; // Hash court pour comparaison rapide
  image_stats: {
    width: number;
    height: number;
    avg_brightness: number;
    contrast: number;
  };
}

export async function generateFingerprint(imageBuffer: Buffer): Promise<FingerprintResult> {
  // Get original image stats
  const metadata = await sharp(imageBuffer).metadata();

  // ── Average Hash (aHash) — 16x16 = 256 bits ──────────────
  const aHashPixels = await sharp(imageBuffer)
    .resize(16, 16, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();

  const avgBrightness = aHashPixels.reduce((sum, v) => sum + v, 0) / aHashPixels.length;

  let aHashBits = "";
  for (let i = 0; i < aHashPixels.length; i++) {
    aHashBits += aHashPixels[i] >= avgBrightness ? "1" : "0";
  }
  const aHash = bitsToHex(aHashBits);

  // ── Difference Hash (dHash) — 16x15 = 240 bits ───────────
  const dHashPixels = await sharp(imageBuffer)
    .resize(17, 16, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();

  let dHashBits = "";
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      const idx = row * 17 + col;
      // Pixel gauche > pixel droite ?
      if (col < 15) {
        dHashBits += dHashPixels[idx] > dHashPixels[idx + 1] ? "1" : "0";
      }
    }
  }
  const dHash = bitsToHex(dHashBits);

  // ── Contrast calculation ──────────────────────────────────
  let minVal = 255, maxVal = 0;
  for (let i = 0; i < aHashPixels.length; i++) {
    if (aHashPixels[i] < minVal) minVal = aHashPixels[i];
    if (aHashPixels[i] > maxVal) maxVal = aHashPixels[i];
  }
  const contrast = maxVal - minVal;

  // ── Combined hash for blockchain ──────────────────────────
  const combined = crypto
    .createHash("sha256")
    .update(`${aHash}:${dHash}:passcore-fingerprint-v1`)
    .digest("hex");

  // Short similarity hash (first 16 chars of aHash for quick comparison)
  const similarity_hash = aHash.slice(0, 16);

  return {
    aHash,
    dHash,
    combined: `0x${combined}`,
    similarity_hash,
    image_stats: {
      width: metadata.width || 0,
      height: metadata.height || 0,
      avg_brightness: Math.round(avgBrightness),
      contrast,
    },
  };
}

/**
 * Compare deux fingerprints et retourne un score de similarité (0-100%).
 * 0% = totalement différent, 100% = identique.
 */
export function compareFingerprintsHamming(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 0;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16);
    const n2 = parseInt(hash2[i], 16);
    // Count different bits
    let xor = n1 ^ n2;
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }

  const totalBits = hash1.length * 4;
  const similarity = ((totalBits - distance) / totalBits) * 100;
  return Math.round(similarity * 100) / 100;
}

function bitsToHex(bits: string): string {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = bits.slice(i, i + 4).padEnd(4, "0");
    hex += parseInt(nibble, 2).toString(16);
  }
  return hex;
}
