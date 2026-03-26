import { describe, it, expect, vi } from "vitest";

// Unmock supabase modules for this test file
vi.unmock("@/lib/supabase/client");
vi.unmock("@/lib/supabase/server");

// Mock the actual supabase packages
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({
    auth: { getSession: vi.fn(), getUser: vi.fn() },
    from: vi.fn(),
  })),
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

describe("Supabase Client Module", () => {
  it("createClient returns a browser client", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});

describe("Supabase Server Module", () => {
  it("createAdminClient returns a server client with service role", async () => {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const client = createAdminClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
