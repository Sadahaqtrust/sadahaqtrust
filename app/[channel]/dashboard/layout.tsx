/**
 * DashboardLayout — Server Component
 *
 * Validates the authenticated seller session and their store membership for
 * the requested channel, then renders the DashboardShell with the brand
 * colour (#F47216) and navigation tabs (Products | Orders | Earnings).
 *
 * Auth + role enforcement is handled upstream by middleware.ts, so by the
 * time this layout runs we can trust the caller has a valid seller JWT.
 * We still verify channel ownership here as an additional guard.
 *
 * Requirements: 1.1, 1.6, 1.9
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "@/app/components/DashboardShell";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

interface SellerStoreSummary {
  id: string;
  name: string;
  handle: string;
}

/**
 * Retrieve the JWT from the incoming request.
 * Next.js 14 Server Components can read cookies() and headers() from the
 * request context without needing next-auth.
 */
function getServerToken(): string | null {
  try {
    // 1. Authorization header (e.g. from internal calls)
    const authHeader = headers().get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
  } catch {
    // headers() can throw outside of a request context in some test setups
  }

  try {
    // 2. dr_token cookie (set by saveToken() in authCookies.ts)
    return cookies().get("dr_token")?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch the seller's store for the given channel handle.
 *
 * Calls `GET /store/seller/products?channel={channel}` with a HEAD-style
 * metadata probe, but since we only need the store identity we use the
 * dedicated `/store/user-roles` endpoint which returns the role + store info.
 *
 * Actual endpoint: `GET /store/seller/store?channel={channel}` (returns the
 * seller's SellerStoreSummary if they own that channel, 403 otherwise).
 *
 * If the endpoint does not yet exist (development), falls back to a synthetic
 * summary derived from the channel handle so the UI can still render.
 */
async function fetchSellerStore(
  token: string,
  channel: string
): Promise<SellerStoreSummary | null> {
  try {
    const res = await fetch(
      `${MEDUSA_URL}/store/seller/store?channel=${encodeURIComponent(channel)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-publishable-api-key": PUB_KEY,
        },
        // Avoid stale layout data
        cache: "no-store",
      }
    );

    if (res.status === 401 || res.status === 403) {
      return null;
    }

    if (res.ok) {
      const data = (await res.json()) as {
        store?: SellerStoreSummary;
        id?: string;
        name?: string;
        handle?: string;
      };
      // Support both { store: {...} } and flat shapes
      return (data.store ?? data) as SellerStoreSummary;
    }

    // Any other non-OK status (500, 404 for channel not found) → deny access
    return null;
  } catch {
    // Network error — deny access rather than granting it
    return null;
  }
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: { channel: string };
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { channel } = params;

  // ── 1. Validate session ────────────────────────────────────────────────────
  const token = getServerToken();
  if (!token) {
    redirect("/auth");
  }

  // ── 2. Validate seller ↔ channel binding ──────────────────────────────────
  const seller = await fetchSellerStore(token, channel);
  if (!seller) {
    redirect("/auth");
  }

  // ── 3. Render shell ────────────────────────────────────────────────────────
  return (
    <DashboardShell channel={channel} seller={seller}>
      {children}
    </DashboardShell>
  );
}
