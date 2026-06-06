import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Resolves the customer_id from a Medusa request.
 * Medusa sets auth_context.actor_id after the customer profile is created.
 * If actor_id is empty (auth registered but /store/customers not yet called),
 * we look up by auth_identity_id → app_metadata.customer_id.
 */
export async function resolveCustomerId(req: any): Promise<string | null> {
  const authCtx = req.auth_context;
  if (!authCtx) return null;

  // Happy path — actor_id is set
  if (authCtx.actor_id) return authCtx.actor_id;

  // Fallback — look up customer via auth_identity app_metadata
  const authIdentityId = authCtx.auth_identity_id;
  if (!authIdentityId) return null;

  try {
    const { rows } = await pool.query(
      `SELECT app_metadata FROM auth_identity WHERE id=$1 AND deleted_at IS NULL`,
      [authIdentityId]
    );
    const meta = rows[0]?.app_metadata;
    if (meta?.customer_id) return meta.customer_id;

    // Last resort — look up customer by email via provider_identity
    const piRows = await pool.query(
      `SELECT entity_id FROM provider_identity WHERE auth_identity_id=$1 AND provider='emailpass' AND deleted_at IS NULL`,
      [authIdentityId]
    );
    const email = piRows.rows[0]?.entity_id;
    if (!email) return null;

    const custRows = await pool.query(
      `SELECT id FROM customer WHERE email=$1 AND deleted_at IS NULL`,
      [email]
    );
    return custRows.rows[0]?.id || null;
  } catch {
    return null;
  }
}

/**
 * Ensures a customer row exists for the given auth identity.
 * Called automatically when actor_id is empty — creates the customer profile
 * and links it to the auth_identity so future tokens have actor_id populated.
 */
export async function ensureCustomer(req: any): Promise<string | null> {
  const authCtx = req.auth_context;
  if (!authCtx) return null;
  if (authCtx.actor_id) return authCtx.actor_id;

  const authIdentityId = authCtx.auth_identity_id;
  if (!authIdentityId) return null;

  const client = await pool.connect();
  try {
    // Get email from provider_identity
    const piRows = await client.query(
      `SELECT entity_id FROM provider_identity WHERE auth_identity_id=$1 AND provider='emailpass' AND deleted_at IS NULL`,
      [authIdentityId]
    );
    const email = piRows.rows[0]?.entity_id;
    if (!email) return null;

    // Check if customer already exists
    let custId: string | null = null;
    const existing = await client.query(
      `SELECT id FROM customer WHERE email=$1 AND deleted_at IS NULL`, [email]
    );
    if (existing.rows[0]) {
      custId = existing.rows[0].id;
    } else {
      // Create customer row
      const newCust = await client.query(
        `INSERT INTO customer (id, email, has_account, created_at, updated_at)
         VALUES ('cus_' || replace(gen_random_uuid()::text,'-',''), $1, true, now(), now())
         RETURNING id`,
        [email]
      );
      custId = newCust.rows[0].id;
    }

    // Link auth_identity → customer
    await client.query(
      `UPDATE auth_identity SET app_metadata = COALESCE(app_metadata,'{}')::jsonb || $1 WHERE id=$2`,
      [JSON.stringify({ customer_id: custId }), authIdentityId]
    );

    return custId;
  } catch {
    return null;
  } finally {
    client.release();
  }
}
