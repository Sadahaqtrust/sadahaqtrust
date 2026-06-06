export const TOKEN_KEY = "dr_token";
export const EXPIRY_KEY = "dr_token_expiry";
export const COOKIE_DOMAIN = ".digitalrohtak.online";
const ONE_YEAR_SEC = 365 * 24 * 60 * 60;

export function setCookie(name: string, value: string, maxAgeSec: number) {
  const domain = typeof window !== "undefined" && window.location.hostname.includes("digitalrohtak.online")
    ? `; domain=${COOKIE_DOMAIN}` : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSec}${domain}; path=/; SameSite=None; Secure`;
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function deleteCookie(name: string) {
  const domain = typeof window !== "undefined" && window.location.hostname.includes("digitalrohtak.online")
    ? `; domain=${COOKIE_DOMAIN}` : "";
  document.cookie = `${name}=; max-age=0${domain}; path=/; SameSite=None; Secure`;
}

export function saveToken(token: string, remember: boolean) {
  const maxAge = remember ? ONE_YEAR_SEC : 86400;
  const expiry = Date.now() + maxAge * 1000;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRY_KEY, String(expiry));
  setCookie(TOKEN_KEY, token, maxAge);
  setCookie(EXPIRY_KEY, String(expiry), maxAge);
}

export function getStoredToken(): string | null {
  let token = localStorage.getItem(TOKEN_KEY);
  let expiry = localStorage.getItem(EXPIRY_KEY);
  if (!token || !expiry) {
    token = getCookie(TOKEN_KEY);
    expiry = getCookie(EXPIRY_KEY);
    if (token && expiry) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(EXPIRY_KEY, expiry);
    }
  }
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    deleteCookie(TOKEN_KEY);
    deleteCookie(EXPIRY_KEY);
    return null;
  }
  return token;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  deleteCookie(TOKEN_KEY);
  deleteCookie(EXPIRY_KEY);
}
