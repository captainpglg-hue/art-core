import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ── Server Components / Route Handlers ────────────────────────
// No Database generic: Supabase JS v2.99 generic resolution incompatible with manual types.
// Query results are cast explicitly where type safety is needed.
export const createServerComponentClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
export const createAdminClient = () =>
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

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
