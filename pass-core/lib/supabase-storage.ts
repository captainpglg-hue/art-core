import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Storage helper for PASS-CORE
 * Uploads certification photos to the 'artworks' bucket.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (service role bypasses RLS)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const BUCKET = "artworks";

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Missing SUPABASE env vars for storage");
    }
    _client = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _client;
}

/**
 * Upload a file buffer to Supabase Storage.
 * @param buffer  The file content
 * @param folder  Storage path prefix (e.g. "cert/<userId>")
 * @param name    Filename with extension
 * @returns       Public URL of the uploaded file
 */
export async function uploadPhoto(
  buffer: Buffer,
  folder: string,
  name: string
): Promise<string> {
  const client = getClient();
  const storagePath = `${folder}/${name}`;

  const { error } = await client.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: "image/jpeg",
      upsert: true, // overwrite if exists
    });

  if (error) {
    console.error("Supabase Storage upload error:", error.message);
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data } = client.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}
