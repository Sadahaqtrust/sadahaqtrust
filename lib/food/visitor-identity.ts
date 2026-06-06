/**
 * VisitorIdentityService. Reads or mints the anonymous dr_food_vid cookie.
 * See design.md §Security and requirements.md Requirement 5.
 *
 * The cookie format is a UUIDv4. We use node:crypto.randomUUID() which
 * produces RFC4122 version-4 UUIDs, matching the regex below.
 */
import { randomUUID } from "node:crypto";
import type { VisitorIdentity } from "./types";

export const COOKIE_NAME = "dr_food_vid";
export const COOKIE_MAX_AGE_SECONDS = 15_552_000; // 180 days
export const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type RequestLike = {
  cookies: { get(name: string): { value: string } | undefined };
};

function buildCookieHeader(value: string): string {
  return (
    `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; ` +
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`
  );
}

export function readOrMint(req: RequestLike): VisitorIdentity {
  const raw = req.cookies.get(COOKIE_NAME)?.value;
  if (raw && UUID_V4_RE.test(raw)) {
    return { visitorId: raw, source: "cookie" };
  }
  const minted = randomUUID();
  return {
    visitorId: minted,
    setCookieHeader: buildCookieHeader(minted),
    source: raw ? "malformed-replaced" : "minted",
  };
}
