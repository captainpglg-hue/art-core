import { createHash } from "crypto";

/**
 * Visual fingerprint generator for artwork certification.
 * Uses SHA-256 hashing of the macro photo buffer combined
 * with perceptual analysis when sharp is available.
 */

interface FingerprintResult {
  combined: string;
  sha256: string;
  perceptual: string;
}

/**
 * Generate a visual fingerprint from a macro photo buffer.
 * Falls back gracefully if sharp (image processing) is unavailable.
 */
export async function generateFingerprint(
  buffer: Buffer
): Promise<FingerprintResult> {
  // SHA-256 hash of raw buffer
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  let perceptual = "";

  try {
    // Try to use sharp for perceptual hashing (resize → grayscale → hash)
    const sharp = (await import("sharp")).default;
    const resized = await sharp(buffer)
      .resize(16, 16, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer();

    // Simple average-hash: compare each pixel to the mean
    const pixels = Array.from(resized);
    const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
    const bits = pixels.map((p) => (p >= mean ? "1" : "0")).join("");

    // Convert binary string to hex
    perceptual = "";
    for (let i = 0; i < bits.length; i += 4) {
      perceptual += parseInt(bits.substring(i, i + 4), 2).toString(16);
    }
  } catch {
    // sharp not available — use a secondary hash with different algorithm
    perceptual = createHash("md5").update(buffer).digest("hex");
  }

  return {
    combined: `${sha256.slice(0, 16)}-${perceptual.slice(0, 16)}`,
    sha256,
    perceptual,
  };
}
