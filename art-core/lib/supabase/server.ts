import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const isConfigured = () => SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

// ── Server Components / Route Handlers ────────────────────────
export const createServerComponentClient = async () => {
  if (!isConfigured()) {
    console.warn("[Supabase] Non configuré — NEXT_PUBLIC_SUPABASE_URL ou ANON_KEY manquant");
    return null;
  }
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as any);
          });
        },
      },
    }
  );
};

// ── Admin / Service Role (bypass RLS) ─────────────────────────
export const createAdminClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn("[Supabase] Admin non configuré — SERVICE_ROLE_KEY manquant");
    return null;
  }
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
};

// ── Auth helpers ──────────────────────────────────────────────
export const getSession = async () => {
  const supabase = await createServerComponentClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

export const getUser = async () => {
  const supabase = await createServerComponentClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getUserProfile = async (userId?: string) => {
  const supabase = await createServerComponentClient();
  const id = userId ?? (await getUser())?.id;
  if (!id) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};
