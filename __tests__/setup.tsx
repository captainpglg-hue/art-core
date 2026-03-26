import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// ── Mock next/navigation ─────────────────────────────────────
const pushMock = vi.fn();
const replaceMock = vi.fn();
const refreshMock = vi.fn();
const backMock = vi.fn();
const prefetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: refreshMock,
    back: backMock,
    prefetch: prefetchMock,
    pathname: "/",
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  useParams: () => ({ id: "test-id" }),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// ── Mock next/link ───────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => {
    // Return an anchor tag so we can test href values
    return <a href={href} {...props}>{children}</a>;
  },
}));

// ── Mock next/image ──────────────────────────────────────────
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// ── Mock next/headers ────────────────────────────────────────
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
  }),
  headers: () => new Map(),
}));

// ── Mock @/hooks/use-toast ───────────────────────────────────
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({
    toast: vi.fn(),
    toasts: [],
    dismiss: vi.fn(),
  }),
}));

// ── Mock @/lib/supabase/client ───────────────────────────────
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}));

// ── Mock @/lib/supabase/server ───────────────────────────────
vi.mock("@/lib/supabase/server", () => ({
  createServerComponentClient: vi.fn(),
  createAdminClient: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  getUserProfile: vi.fn(),
}));

// ── Mock @/lib/db ────────────────────────────────────────────
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({
      get: vi.fn(),
      all: vi.fn(() => []),
      run: vi.fn(),
    })),
    pragma: vi.fn(),
  })),
  getUserByEmail: vi.fn(),
  getUserByToken: vi.fn(),
  getUserById: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getArtworks: vi.fn(() => []),
  countArtworks: vi.fn(() => 0),
  getArtworkById: vi.fn(),
  getGaugeEntries: vi.fn(() => []),
  awardPoints: vi.fn(),
}));

// ── Mock bcryptjs ────────────────────────────────────────────
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  compare: vi.fn(),
  hash: vi.fn(),
}));

// ── Mock fetch globally ──────────────────────────────────────
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    status: 200,
  })
) as any;

// ── Mock recharts to avoid rendering issues ──────────────────
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Area: () => null,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

// ── Mock react-hook-form partially (let it work but mock resolver) ──
vi.mock("@hookform/resolvers/zod", () => ({
  zodResolver: () => vi.fn(),
}));

// ── Suppress console.error for expected React warnings ───────
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("Not implemented: HTMLFormElement.prototype.requestSubmit")) return;
    if (typeof args[0] === "string" && args[0].includes("act(...)")) return;
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
