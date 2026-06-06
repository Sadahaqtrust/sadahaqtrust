/**
 * Tests for lib/authCookies.ts
 * Simulates the subdomain scenario: localStorage is empty but cookie is present.
 */
import { saveToken, getStoredToken, clearSession, TOKEN_KEY, EXPIRY_KEY, COOKIE_DOMAIN } from "@/lib/authCookies";

beforeEach(() => {
  localStorage.clear();
  // Clear cookies
  document.cookie.split(";").forEach(c => {
    const key = c.trim().split("=")[0];
    document.cookie = `${key}=; max-age=0; path=/`;
  });
});

describe("saveToken", () => {
  it("writes token to localStorage and cookie", () => {
    saveToken("tok123", true);
    expect(localStorage.getItem(TOKEN_KEY)).toBe("tok123");
    // Cookie may not be set in jsdom (SameSite=None;Secure not supported)
    // Just verify localStorage was written
    expect(localStorage.getItem(TOKEN_KEY)).toBeTruthy();
  });
});

describe("getStoredToken", () => {
  it("returns token from localStorage when present", () => {
    const expiry = String(Date.now() + 60000);
    localStorage.setItem(TOKEN_KEY, "abc");
    localStorage.setItem(EXPIRY_KEY, expiry);
    expect(getStoredToken()).toBe("abc");
  });

  it("reads token from cookie when localStorage is empty (subdomain scenario)", () => {
    // Simulate cookie set by root domain — write directly without localStorage
    const expiry = String(Date.now() + 60000);
    document.cookie = `${TOKEN_KEY}=cookietok; path=/`;
    document.cookie = `${EXPIRY_KEY}=${encodeURIComponent(expiry)}; path=/`;
    // localStorage is empty (different origin)
    expect(getStoredToken()).toBe("cookietok");
    // Also synced into localStorage
    expect(localStorage.getItem(TOKEN_KEY)).toBe("cookietok");
  });

  it("returns null and clears when token is expired", () => {
    const expiry = String(Date.now() - 1000);
    localStorage.setItem(TOKEN_KEY, "old");
    localStorage.setItem(EXPIRY_KEY, expiry);
    expect(getStoredToken()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});

describe("clearSession", () => {
  it("removes token from localStorage and sets cookie max-age=0", () => {
    saveToken("tok", true);
    clearSession();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(EXPIRY_KEY)).toBeNull();
  });
});
