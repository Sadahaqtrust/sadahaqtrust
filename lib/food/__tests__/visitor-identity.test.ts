/** @jest-environment node */
import { readOrMint, COOKIE_NAME, UUID_V4_RE } from "../visitor-identity";

function reqWithCookie(value: string | undefined) {
  return {
    cookies: {
      get: (n: string) => (n === COOKIE_NAME && value ? { value } : undefined),
    },
  };
}

describe("VisitorIdentityService.readOrMint", () => {
  it("mints a fresh v4 UUID when no cookie is present", () => {
    const r = readOrMint(reqWithCookie(undefined));
    expect(UUID_V4_RE.test(r.visitorId)).toBe(true);
    expect(r.source).toBe("minted");
    expect(r.setCookieHeader).toBeDefined();
    expect(r.setCookieHeader!.startsWith(`${COOKIE_NAME}=`)).toBe(true);
    expect(r.setCookieHeader!).toMatch(/HttpOnly/);
    expect(r.setCookieHeader!).toMatch(/Secure/);
    expect(r.setCookieHeader!).toMatch(/SameSite=Lax/);
    expect(r.setCookieHeader!).toMatch(/Path=\//);
    expect(r.setCookieHeader!).toMatch(/Max-Age=15552000/);
  });

  it("reuses the cookie without setCookieHeader when the value is a valid v4", () => {
    const valid = "12345678-1234-4abc-89ab-1234567890ab";
    const r = readOrMint(reqWithCookie(valid));
    expect(r.visitorId).toBe(valid);
    expect(r.source).toBe("cookie");
    expect(r.setCookieHeader).toBeUndefined();
  });

  it("replaces a malformed cookie and emits a single Set-Cookie", () => {
    const r = readOrMint(reqWithCookie("not-a-uuid"));
    expect(UUID_V4_RE.test(r.visitorId)).toBe(true);
    expect(r.source).toBe("malformed-replaced");
    expect(r.setCookieHeader).toBeDefined();
  });
});
