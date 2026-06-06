import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Pool } from "pg";
import { ensureCustomer } from "../auth-helper";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = await ensureCustomer(req);
  if (!customerId) return res.status(401).json({ error: "Unauthorized" });

  const [rolesRes, profileRes, sellerRes, riderRes, spRes] = await Promise.all([
    pool.query(
      `SELECT cg.id, cg.name, cg.metadata FROM customer_group_customer cgc
       JOIN customer_group cg ON cg.id=cgc.customer_group_id
       WHERE cgc.customer_id=$1 AND cgc.deleted_at IS NULL AND cg.deleted_at IS NULL`,
      [customerId]
    ),
    pool.query(`SELECT * FROM dr_user_profile WHERE customer_id=$1 AND deleted_at IS NULL`, [customerId]),
    pool.query(
      `SELECT dsp.*, sc.name as sc_name, sc.is_disabled FROM dr_seller_profile dsp
       LEFT JOIN sales_channel sc ON sc.id=dsp.sales_channel_id
       WHERE dsp.customer_id=$1 AND dsp.deleted_at IS NULL`,
      [customerId]
    ),
    pool.query(`SELECT * FROM dr_rider_profile WHERE customer_id=$1 AND deleted_at IS NULL`, [customerId]),
    pool.query(`SELECT * FROM service_provider WHERE customer_id=$1 AND deleted_at IS NULL`, [customerId]),
  ]);

  return res.json({
    customer_id: customerId,
    roles: rolesRes.rows.map(r => ({
      id: r.id, type: r.metadata?.type,
      label_hi: r.metadata?.label_hi, label_en: r.metadata?.label_en, icon: r.metadata?.icon,
    })),
    user_profile: profileRes.rows[0] || null,
    seller_profile: sellerRes.rows[0] || null,
    rider_profile: riderRes.rows[0] || null,
    service_provider_profile: spRes.rows[0] || null,
  });
}
