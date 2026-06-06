import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Pool } from "pg";
import { ensureCustomer } from "../auth-helper";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = await ensureCustomer(req);
  if (!customerId) return res.status(401).json({ error: "Unauthorized" });
  const { rows } = await pool.query(
    `SELECT * FROM dr_rider_profile WHERE customer_id=$1 AND deleted_at IS NULL`, [customerId]
  );
  return res.json({ rider_profile: rows[0] || null });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = await ensureCustomer(req);
  if (!customerId) return res.status(401).json({ error: "Unauthorized" });

  const { vehicle_type, vehicle_number, license_number, zone } = req.body as any;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      `INSERT INTO dr_rider_profile (id, customer_id, vehicle_type, vehicle_number, license_number, zone, created_at, updated_at)
       VALUES ('drp_' || replace(gen_random_uuid()::text,'-',''), $1,$2,$3,$4,$5, now(), now())
       ON CONFLICT (customer_id) DO UPDATE SET
         vehicle_type=$2, vehicle_number=$3, license_number=$4, zone=$5, updated_at=now(), deleted_at=NULL
       RETURNING *`,
      [customerId, vehicle_type, vehicle_number, license_number, zone]
    );
    await client.query(
      `INSERT INTO customer_group_customer (id, customer_id, customer_group_id, created_at, updated_at)
       VALUES ('cgc_' || gen_random_uuid()::text, $1, 'cg_rider', now(), now()) ON CONFLICT DO NOTHING`,
      [customerId]
    );
    await client.query(
      `UPDATE customer_group_customer SET deleted_at=NULL, updated_at=now()
       WHERE customer_id=$1 AND customer_group_id='cg_rider' AND deleted_at IS NOT NULL`,
      [customerId]
    );
    await client.query("COMMIT");
    return res.json({ rider_profile: r.rows[0] });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
