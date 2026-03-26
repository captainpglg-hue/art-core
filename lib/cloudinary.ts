import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

export const UPLOAD_PRESETS = {
  ARTWORKS: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_ARTWORKS ?? "art_core_artworks",
  AVATARS: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_AVATARS ?? "art_core_avatars",
} as const;

export const FOLDERS = {
  ARTWORKS: "art-core/artworks",
  AVATARS: "art-core/avatars",
  PASS_CORE: "art-core/pass-core",
} as const;

// ── Upload artwork (HD + watermarked preview) ─────────────────
export const uploadArtwork = async (
  filePath: string,
  artworkId: string,
  options: { watermark?: boolean; quality?: "hd" | "preview" } = {}
) => {
  const { watermark = false, quality = "hd" } = options;

  const transformations: Record<string, unknown>[] = [];

  if (watermark) {
    transformations.push({
      overlay: {
        font_family: "Arial",
        font_size: 40,
        font_weight: "bold",
        text: "© Art-Core — Unveil the Unique",
      },
      gravity: "center",
      opacity: 18,
      angle: -35,
      color: "#FFFFFF",
    });
  }

  if (quality === "preview") {
    transformations.push(
      { width: 1200, crop: "limit" },
      { quality: "auto:low", fetch_format: "auto" }
    );
  } else {
    transformations.push({ quality: "auto:best", fetch_format: "auto" });
  }

  return cloudinary.uploader.upload(filePath, {
    folder: `${FOLDERS.ARTWORKS}/${artworkId}`,
    public_id: quality === "hd" ? `${artworkId}_hd` : `${artworkId}_preview`,
    transformation: transformations,
    resource_type: "image",
    overwrite: true,
    tags: ["artwork", quality],
  });
};

// ── Signed upload URL (for client-side direct upload) ─────────
export const getSignedUploadParams = (artworkId: string) => {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `${FOLDERS.ARTWORKS}/${artworkId}`;

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
      upload_preset: UPLOAD_PRESETS.ARTWORKS,
    },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    folder,
  };
};

// ── Generate watermarked URL from existing public_id ──────────
export const getWatermarkedUrl = (publicId: string) => {
  return cloudinary.url(publicId, {
    transformation: [
      {
        overlay: {
          font_family: "Arial",
          font_size: 36,
          font_weight: "bold",
          text: "© Art-Core",
        },
        gravity: "center",
        opacity: 20,
        angle: -35,
        color: "#FFFFFF",
      },
      { quality: "auto", fetch_format: "auto" },
    ],
  });
};

// ── Thumbnail URL ─────────────────────────────────────────────
export const getThumbnailUrl = (
  publicId: string,
  width = 400,
  height = 400
) => {
  return cloudinary.url(publicId, {
    transformation: [
      { width, height, crop: "fill", gravity: "auto" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });
};

// ── Delete artwork images ─────────────────────────────────────
export const deleteArtworkImages = async (artworkId: string) => {
  return cloudinary.api.delete_resources_by_prefix(
    `${FOLDERS.ARTWORKS}/${artworkId}`
  );
};
