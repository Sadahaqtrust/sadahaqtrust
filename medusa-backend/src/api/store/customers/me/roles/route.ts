import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Pool } from "pg";
import { ensureCustomer } from "../auth-helper";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const typeToGroup: Record<string, string> = {
  customer: "cg_customer", seller: "cg_seller",
  restaurant_owner: "cg_restaurant_owner", rider: "cg_rider",
  professional: "cg_professional", service_provider: "cg_service_provider",
};

// GET /store/customers/me/roles
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = await ensureCustomer(req);
  if (!customerId) return res.status(401).json({ error: "Unauthorized" });

  const { rows } = await pool.query(
    `SELECT cg.id, cg.name, cg.metadata
     FROM customer_group_customer cgc
     JOIN customer_group cg ON cg.id = cgc.customer_group_id
     WHERE cgc.customer_id = $1 AND cgc.deleted_at IS NULL AND cg.deleted_at IS NULL`,
    [customerId]
  );
  return res.json({
    roles: rows.map(r => ({
      id: r.id, type: r.metadata?.type,
      label_hi: r.metadata?.label_hi, label_en: r.metadata?.label_en, icon: r.metadata?.icon,
    }))
  });
}

// POST /store/customers/me/roles  body: { add?: string[], remove?: string[] }
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = await ensureCustomer(req);
  if (!customerId) return res.status(401).json({ error: "Unauthorized" });

  const { add = [], remove = [] } = req.body as { add?: string[]; remove?: string[] };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const type of add) {
      const groupId = typeToGroup[type];
      if (!groupId) continue;
      // Check if an active membership already exists (prevent duplicates)
      const { rows: existing } = await client.query(
        `SELECT id FROM customer_group_customer
         WHERE customer_id=$1 AND customer_group_id=$2 AND deleted_at IS NULL`,
        [customerId, groupId]
      );
      if (existing.length > 0) continue; // Already has this role — skip
      // Check if a soft-deleted membership exists — reactivate it
      const { rowCount } = await client.query(
        `UPDATE customer_group_customer SET deleted_at=NULL, updated_at=now()
         WHERE customer_id=$1 AND customer_group_id=$2 AND deleted_at IS NOT NULL`,
        [customerId, groupId]
      );
      if ((rowCount ?? 0) === 0) {
        // No existing row at all — insert new
        await client.query(
          `INSERT INTO customer_group_customer (id, customer_id, customer_group_id, created_at, updated_at)
           VALUES ('cgc_' || gen_random_uuid()::text, $1, $2, now(), now())`,
          [customerId, groupId]
        );
      }
    }
    for (const type of remove) {
      const groupId = typeToGroup[type];
      if (!groupId) continue;
      await client.query(
        `UPDATE customer_group_customer SET deleted_at=now(), updated_at=now()
         WHERE customer_id=$1 AND customer_group_id=$2`,
        [customerId, groupId]
      );
    }
    await client.query("COMMIT");
    const { rows } = await client.query(
      `SELECT cg.id, cg.name, cg.metadata
       FROM customer_group_customer cgc
       JOIN customer_group cg ON cg.id = cgc.customer_group_id
       WHERE cgc.customer_id=$1 AND cgc.deleted_at IS NULL AND cg.deleted_at IS NULL`,
      [customerId]
    );
    return res.json({
      roles: rows.map(r => ({
        id: r.id, type: r.metadata?.type,
        label_hi: r.metadata?.label_hi, label_en: r.metadata?.label_en, icon: r.metadata?.icon,
      }))
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
