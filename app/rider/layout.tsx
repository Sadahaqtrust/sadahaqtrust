/**
 * Rider App Layout — Server Component
 *
 * Auth guard for all /rider routes. Redirects to /auth when:
 *  - No dr_token cookie and no Authorization header
 *
 * Role enforcement (rider-only) is handled upstream by middleware.ts.
 * This layout provides the second layer of defence for direct Server
 * Component rendering.
 *
 * Requirements: 4.5
 */

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

/** Extract JWT from Authorization header or dr_token cookie. */
function getServerToken(): string | null {
  try {
    const authHeader = headers().get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
  } catch {
    // headers() may throw outside request context
  }

  try {
    return cookies().get("dr_token")?.value ?? null;
  } catch {
    return null;
  }
}

interface RiderLayoutProps {
  children: React.ReactNode;
}

export default async function RiderLayout({ children }: RiderLayoutProps) {
  const token = getServerToken();
  if (!token) {
    redirect("/auth");
  }

  return <>{children}</>;
}
