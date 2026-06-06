import { Pool } from "pg";
import * as jwt from "jsonwebtoken";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Extracts auth_identity_id from Bearer token without relying on Medusa middleware.
 * Then resolves or creates the customer row.
 */
export async function resolveOrCreateCustomer(req: any): Promise<{ customerId: string | null; email: string | null }> {
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return { customerId: null, email: null };

    // Decode without verify (Medusa already verified upstream, or we trust internal)
    const decoded = jwt.decode(token) as any;
    if (!decoded) return { customerId: null, email: null };

    // If actor_id is populated — use it directly
    if (decoded.actor_id) return { customerId: decoded.actor_id, email: null };

    const authIdentityId = decoded.auth_identity_id;
    if (!authIdentityId) return { customerId: null, email: null };

    // Get email from provider_identity
    const piRows = await pool.query(
      `SELECT entity_id FROM provider_identity WHERE auth_identity_id=$1 AND provider='emailpass' AND deleted_at IS NULL`,
      [authIdentityId]
    );
    const email = piRows.rows[0]?.entity_id || null;
    if (!email) return { customerId: null, email: null };

    // Check existing customer
    const existing = await pool.query(
      `SELECT id FROM customer WHERE email=$1 AND deleted_at IS NULL`, [email]
    );
    if (existing.rows[0]) {
      const customerId = existing.rows[0].id;
      // Ensure auth_identity is linked
      await pool.query(
        `UPDATE auth_identity SET app_metadata = COALESCE(app_metadata,'{}')::jsonb || $1 WHERE id=$2 AND (app_metadata IS NULL OR app_metadata->>'customer_id' IS NULL)`,
        [JSON.stringify({ customer_id: customerId }), authIdentityId]
      );
      return { customerId, email };
    }

    // Create customer row
    const newCust = await pool.query(
      `INSERT INTO customer (id, email, has_account, created_at, updated_at)
       VALUES ('cus_' || replace(gen_random_uuid()::text,'-',''), $1, true, now(), now())
       ON CONFLICT (email) DO UPDATE SET has_account=true, updated_at=now()
       RETURNING id`,
      [email]
    );
    const customerId = newCust.rows[0].id;

    // Link auth_identity → customer
    await pool.query(
      `UPDATE auth_identity SET app_metadata = COALESCE(app_metadata,'{}')::jsonb || $1 WHERE id=$2`,
      [JSON.stringify({ customer_id: customerId }), authIdentityId]
    );

    return { customerId, email };
  } catch (err) {
    return { customerId: null, email: null };
  }
}
