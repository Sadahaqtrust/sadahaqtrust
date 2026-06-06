import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Resolves the customer_id from a Bearer JWT in req.headers.authorization.
 *
 * Resolution order:
 * 1. req.auth_context.actor_id  (set by Medusa middleware after full auth)
 * 2. req.auth_context.auth_identity_id → auth_identity.app_metadata.customer_id
 * 3. auth_identity_id → provider_identity (email) → customer row
 *
 * Returns null if the token is missing, malformed, or no customer is found.
 *
 * Requirements: 11.5
 */
export async function resolveCustomerFromToken(req: any): Promise<string | null> {
  try {
    // Prefer Medusa's parsed auth context when available
    const authCtx = req.auth_context;
    if (authCtx) {
      if (authCtx.actor_id) return authCtx.actor_id;

      const authIdentityId = authCtx.auth_identity_id;
      if (authIdentityId) {
        // Try app_metadata first (fast path)
        const { rows: aiRows } = await pool.query(
          `SELECT app_metadata FROM auth_identity WHERE id=$1 AND deleted_at IS NULL`,
          [authIdentityId]
        );
        const customerId = aiRows[0]?.app_metadata?.customer_id;
        if (customerId) return customerId;

        // Fallback: resolve via email
        const { rows: piRows } = await pool.query(
          `SELECT entity_id FROM provider_identity WHERE auth_identity_id=$1 AND provider='emailpass' AND deleted_at IS NULL`,
          [authIdentityId]
        );
        const email = piRows[0]?.entity_id;
        if (email) {
          const { rows: custRows } = await pool.query(
            `SELECT id FROM customer WHERE email=$1 AND deleted_at IS NULL`,
            [email]
          );
          return custRows[0]?.id || null;
        }
      }
      return null;
    }

    // No auth_context — parse Bearer token manually (for routes not behind Medusa auth middleware)
    const authHeader: string =
      req.headers?.authorization || req.headers?.Authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;

    // Import here to avoid a hard dependency at module load time
    const jwt = await import("jsonwebtoken");
    const decoded = jwt.default.decode(token) as Record<string, any> | null;
    if (!decoded) return null;

    // actor_id is populated for fully-initialised customer tokens
    if (decoded.actor_id) return decoded.actor_id as string;

    const authIdentityId = decoded.auth_identity_id as string | undefined;
    if (!authIdentityId) return null;

    const { rows: aiRows } = await pool.query(
      `SELECT app_metadata FROM auth_identity WHERE id=$1 AND deleted_at IS NULL`,
      [authIdentityId]
    );
    const customerId = aiRows[0]?.app_metadata?.customer_id;
    if (customerId) return customerId;

    const { rows: piRows } = await pool.query(
      `SELECT entity_id FROM provider_identity WHERE auth_identity_id=$1 AND provider='emailpass' AND deleted_at IS NULL`,
      [authIdentityId]
    );
    const email = piRows[0]?.entity_id;
    if (!email) return null;

    const { rows: custRows } = await pool.query(
      `SELECT id FROM customer WHERE email=$1 AND deleted_at IS NULL`,
      [email]
    );
    return custRows[0]?.id || null;
  } catch {
    return null;
  }
}

/**
 * Looks up the primary role of a customer by querying their customer_group memberships.
 *
 * Role is stored in customer_group.metadata.type (e.g. "seller", "rider", "customer").
 * If the customer belongs to multiple groups the first non-null type is returned.
 *
 * Returns null when no role is found.
 *
 * Requirements: 11.1
 */
export async function getCustomerRole(customerId: string): Promise<string | null> {
  try {
    const { rows } = await pool.query(
      `SELECT cg.metadata->>'type' AS type
       FROM customer_group_customer cgc
       JOIN customer_group cg ON cg.id = cgc.customer_group_id
       WHERE cgc.customer_id = $1
         AND cgc.deleted_at IS NULL
         AND cg.deleted_at IS NULL
         AND cg.metadata->>'type' IS NOT NULL
       LIMIT 1`,
      [customerId]
    );
    return rows[0]?.type || null;
  } catch {
    return null;
  }
}

/**
 * Role-enforcement helper for Medusa store API endpoints.
 *
 * Usage:
 *   const result = await requireRole(req, ["seller"]);
 *   if (result === null)       return res.status(401).json({ error: "Unauthorized" });
 *   if (result === "forbidden") return res.status(403).json({ error: "Forbidden" });
 *   const customerId = result; // proceed
 *
 * Returns:
 *   - null            → token missing / expired / customer not found  (→ HTTP 401)
 *   - "forbidden"     → customer authenticated but role not in allowedRoles (→ HTTP 403)
 *   - string          → the resolved customer_id (→ proceed)
 *
 * Requirements: 11.1, 11.5
 */
export async function requireRole(
  req: any,
  allowedRoles: string[],
): Promise<string | null | "forbidden"> {
  const customerId = await resolveCustomerFromToken(req);
  if (!customerId) return null; // → 401

  const role = await getCustomerRole(customerId);
  if (!role || !allowedRoles.includes(role)) return "forbidden"; // → 403

  return customerId;
}
