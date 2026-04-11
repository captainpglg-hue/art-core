import { createBrowserClient } from "@supabase/ssr";

// No Database generic — see lib/supabase/server.ts for explanation.
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
