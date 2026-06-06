import { MedusaRequest } from "@medusajs/framework";

const MAX_ATTEMPTS = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Indian UTR formats:
// NEFT: 16 chars alphanumeric e.g. SBIN026261234567
// IMPS: 12 digits e.g. 123456789012
// UPI ref: 12 digits e.g. 407612345678
// RTGS: 22 chars e.g. SBIN22001234567890123456
const UTR_REGEX = /^[A-Z0-9]{12,22}$/i;

export function validateUTR(utr: string): { valid: boolean; reason?: string } {
  if (!utr || typeof utr !== "string") return { valid: false, reason: "UTR is required" };
  const cleaned = utr.trim().toUpperCase();
  if (!UTR_REGEX.test(cleaned)) return { valid: false, reason: "Invalid UTR format. Must be 12-22 alphanumeric characters" };
  // Reject obvious test/fake values
  const fakePatterns = [/^0+$/, /^1+$/, /^TEST/i, /^FAKE/i, /^DUMMY/i, /^1234567890/];
  for (const p of fakePatterns) {
    if (p.test(cleaned)) return { valid: false, reason: "Invalid UTR" };
  }
  return { valid: true };
}

export function isTestMode(): boolean {
  return process.env.UPI_TEST_MODE === "true";
}

export function generateTestUTR(prefix: string): string {
  const ts = Date.now().toString().slice(-10);
  return `TEST${prefix}${ts}`.toUpperCase().slice(0, 22);
}

export async function checkAdminAuth(req: MedusaRequest): Promise<{ allowed: boolean; email?: string; reason?: string }> {
  const adminEmail = process.env.UPI_ADMIN_EMAIL || "sadahaqtrust@gmail.com";
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return { allowed: false, reason: "No auth token" };
    const token = authHeader.slice(7);

    // Verify token via Medusa auth module directly
    const { http } = await import("@medusajs/framework/http");
    const authModule = (req as any).scope?.resolve?.("auth");
    if (!authModule) return { allowed: false, reason: "Auth module unavailable" };

    let payload: any;
    try {
      const jwt = await import("jsonwebtoken");
      payload = jwt.decode(token) as any;
    } catch {
      return { allowed: false, reason: "Invalid token" };
    }

    if (!payload?.app_metadata?.customer_id) return { allowed: false, reason: "Invalid token" };

    // Get customer from Medusa
    const customerModule = (req as any).scope?.resolve?.("customer");
    if (!customerModule) return { allowed: false, reason: "Customer module unavailable" };

    const [customer] = await customerModule.listCustomers({ id: [payload.app_metadata.customer_id] });
    if (!customer) return { allowed: false, reason: "Customer not found" };

    if (customer.email?.toLowerCase() !== adminEmail.toLowerCase()) {
      return { allowed: false, reason: "Not authorized — admin only" };
    }
    return { allowed: true, email: customer.email };
  } catch (e: any) {
    return { allowed: false, reason: "Auth check failed: " + e.message };
  }
}

export function checkRateLimit(upiPayment: any): { allowed: boolean; reason?: string } {
  if ((upiPayment.attempt_count || 0) >= MAX_ATTEMPTS) {
    const lastAttempt = upiPayment.last_attempt_at ? new Date(upiPayment.last_attempt_at).getTime() : 0;
    if (Date.now() - lastAttempt < RATE_WINDOW_MS) {
      return { allowed: false, reason: `Too many attempts. Try again after 15 minutes` };
    }
  }
  return { allowed: true };
}

export function getClientIP(req: MedusaRequest): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req.socket as any)?.remoteAddress ||
    "unknown"
  );
}

export function auditUPI(action: string, details: Record<string, any>, ip: string) {
  const ts = new Date().toISOString();
  console.log(`[UPI AUDIT] ${ts} | ${action} | IP:${ip} | ${JSON.stringify(details)}`);
}
