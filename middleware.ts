import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Role-based access rules (Requirement 11)
// ---------------------------------------------------------------------------

type UserRole = "customer" | "seller" | "rider";

const ROLE_RULES: Array<{
  pattern: RegExp;
  allowedRoles: UserRole[];
  /** Where to redirect each role that is NOT in allowedRoles. */
  redirectMap: Record<UserRole, string>;
}> = [
  {
    // Seller Dashboard: /[channel]/dashboard and any sub-paths
    pattern: /^\/[^/]+\/dashboard(\/.*)?$/,
    allowedRoles: ["seller"],
    redirectMap: {
      customer: "/",
      seller: "", // no redirect needed — role is allowed
      rider: "/rider",
    },
  },
  {
    // Rider App: /rider and any sub-paths
    pattern: /^\/rider(\/.*)?$/,
    allowedRoles: ["rider"],
    redirectMap: {
      customer: "/",
      seller: "/food/dashboard",
      rider: "", // no redirect needed — role is allowed
    },
  },
];

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

/** Extract the JWT from the Authorization header or the dr_token cookie. */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return request.cookies.get("dr_token")?.value ?? null;
}

/**
 * Resolve the user's role from the Medusa /store/user-roles API.
 * Caches the result in a Redis-backed cache via the BFF route /api/user-role-cache.
 * Falls back gracefully if the cache or Medusa are unreachable.
 *
 * NOTE: Next.js Edge Runtime does not support the `ioredis` package directly.
 * We use a lightweight Redis REST fetch (Upstash-compatible or our own cache route)
 * with a 60-second TTL per-user token. If the cache endpoint is unavailable the
 * function falls through to a direct Medusa call.
 */
async function getUserRole(
  token: string,
  request: NextRequest
): Promise<UserRole | null> {
  // ── 1. Try the Redis cache via the storefront's own BFF cache API ──────────
  try {
    const cacheUrl = new URL("/api/user-role-cache", request.url);
    cacheUrl.searchParams.set("token", token);
    const cacheRes = await fetch(cacheUrl.toString(), {
      headers: { "x-internal": "1" },
      // Edge fetch has implicit 10 s timeout
    });
    if (cacheRes.ok) {
      const { role } = (await cacheRes.json()) as { role?: UserRole };
      if (role) return role;
    }
  } catch {
    // Cache unavailable — proceed to direct lookup
  }

  // ── 2. Direct Medusa lookup ────────────────────────────────────────────────
  try {
    const res = await fetch(`${MEDUSA_URL}/store/user-roles`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUB_KEY,
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { role?: UserRole };
    return data.role ?? null;
  } catch {
    return null;
  }
}

function redirectTo(destination: string, request: NextRequest) {
  return NextResponse.redirect(new URL(destination, request.url), 303);
}

// ---------------------------------------------------------------------------
// Subdomain routing tables (unchanged from prior implementation)
// ---------------------------------------------------------------------------

const DEDICATED_ROUTES: Record<string, string> = {
  sadahaq: "/sadahaq",
  shopping: "/shopping",
  pgdb: "/pgdb",
  food: "/food",
  fruits: "/fruits",
  professionalservices: "/professionalservices",
};

const BYPASS = ["pgadmin", "db", "console", "api"];

const SERVICE_SUBDOMAINS: Record<string, string> = {
  advocate: "cat_lawyer",
  lawyer: "cat_lawyer",
  legal: "cat_lawyer",
  ca: "cat_ca",
  accountant: "cat_ca",
  cs: "cat_cs",
  property: "cat_property",
  realestate: "cat_property",
  insurance: "cat_insurance",
  architect: "cat_architect",
  interior: "cat_interior",
  notary: "cat_notary",
  hr: "cat_hr",
  civilengineer: "cat_civil_eng",
  tax: "cat_tax_consultant",
  gst: "cat_gst_consultant",
  finance: "cat_financial_planner",
  stockadvisor: "cat_stock_advisor",
  loan: "cat_loan_agent",
  mutualfund: "cat_mutual_fund",
  surveyor: "cat_surveyor",
  valuer: "cat_valuer",
  townplanner: "cat_town_planner",
  structural: "cat_structural_eng",
  mep: "cat_mep_eng",
  landscape: "cat_landscape",
  vastu: "cat_vastu",
  immigration: "cat_immigration",
  visa: "cat_visa_agent",
  passport: "cat_passport_agent",
  detective: "cat_detective",
  security: "cat_security_guard",
  eventmanagement: "cat_event_mgmt",
  electrician: "cat_electrician",
  plumber: "cat_plumber",
  carpenter: "cat_carpenter",
  painter: "cat_painter",
  cleaning: "cat_cleaning",
  pestcontrol: "cat_pest",
  salon: "cat_womens_salon",
  beauty: "cat_womens_salon",
  gym: "cat_fitness",
  yoga: "cat_yoga",
  tutor: "cat_tutor_6_10",
  coaching: "cat_coaching",
  photography: "cat_photo",
  catering: "cat_caterer",
  dentist: "cat_dentist",
  vet: "cat_vet",
  pharmacy: "cat_doctor",
  health: "cat_doctor",
  hospital: "cat_doctor",
  driving: "cat_driving",
  music: "cat_music",
  laundry: "cat_laundry",
  tailoring: "cat_tailor",
  movers: "cat_packers",
};

// ---------------------------------------------------------------------------
// Main middleware function
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // ── Static / internal path bypass ─────────────────────────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/banners") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/edit-services") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/offline.html" ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // ── Non-digitalrohtak host — pass through ──────────────────────────────────
  if (
    !host.endsWith(".digitalrohtak.online") &&
    host !== "digitalrohtak.online"
  ) {
    return NextResponse.next();
  }

  // ── Role-based access enforcement (root domain only) ──────────────────────
  // Only applies on the root domain (no subdomain), where the seller dashboard
  // and rider app routes live.
  if (host === "digitalrohtak.online") {
    for (const rule of ROLE_RULES) {
      if (rule.pattern.test(pathname)) {
        // Requires authentication
        const token = extractToken(request);
        if (!token) {
          return redirectTo("/auth", request);
        }

        const role = await getUserRole(token, request);
        if (!role) {
          // Token invalid / expired
          return redirectTo("/auth", request);
        }

        if (!rule.allowedRoles.includes(role)) {
          const destination = rule.redirectMap[role];
          // redirectMap entries for allowed roles are "" — never reached here,
          // but guard against it just in case
          if (!destination) return NextResponse.next();
          return redirectTo(destination, request);
        }

        // Role is allowed — proceed
        break;
      }
    }

    return NextResponse.next();
  }

  // ── Subdomain routing ─────────────────────────────────────────────────────
  const sub = host.split(".")[0];

  if (BYPASS.includes(sub)) {
    return NextResponse.next();
  }

  if (DEDICATED_ROUTES[sub]) {
    const base = DEDICATED_ROUTES[sub];
    if (pathname.startsWith(base)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `${base}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (SERVICE_SUBDOMAINS[sub]) {
    const url = request.nextUrl.clone();
    if (pathname.startsWith("/professionalservices")) return NextResponse.next();
    url.pathname = `/professionalservices${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // All other subdomains → Work In Progress
  if (pathname === "/" || pathname === "") {
    const url = request.nextUrl.clone();
    url.pathname = "/wip";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
