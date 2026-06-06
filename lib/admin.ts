// Only this email can see Edit Layout on any page
export const ADMIN_EMAIL = "sadahaqtrust@gmail.com";

export function isAdmin(email?: string | null): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

// Session duration
export const SESSION_DURATION_MS = 365 * 24 * 60 * 60 * 1000; // 1 year
