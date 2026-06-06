import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Pool } from "pg";
import { ensureCustomer } from "../auth-helper";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = await ensureCustomer(req);
  if (!customerId) return res.status(401).json({ error: "Unauthorized" });
  const { rows } = await pool.query(
    `SELECT dsp.*, sc.name as sc_name, sc.is_disabled as sc_disabled
     FROM dr_seller_profile dsp
     LEFT JOIN sales_channel sc ON sc.id = dsp.sales_channel_id
     WHERE dsp.customer_id=$1 AND dsp.deleted_at IS NULL`,
    [customerId]
  );
  return res.json({ seller_profile: rows[0] || null });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = await ensureCustomer(req);
  if (!customerId) return res.status(401).json({ error: "Unauthorized" });

  const { shop_name, category, market_slug, gst_number, fssai_license,
          pan_number, shop_address, opening_time, closing_time } = req.body as any;

  if (!shop_name?.trim()) return res.status(400).json({ error: "shop_name required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const custRow = await client.query(`SELECT email FROM customer WHERE id=$1`, [customerId]);
    const email = custRow.rows[0]?.email || "";

    const existing = await client.query(
      `SELECT id, sales_channel_id FROM dr_seller_profile WHERE customer_id=$1 AND deleted_at IS NULL`,
      [customerId]
    );
    let scId = existing.rows[0]?.sales_channel_id;

    if (!scId) {
      const scRes = await client.query(
        `INSERT INTO sales_channel (id, name, description, is_disabled, metadata, created_at, updated_at)
         VALUES ('sc_' || replace(gen_random_uuid()::text,'-',''), $1, $2, false, $3, now(), now()) RETURNING id`,
        [
          shop_name,
          `${category || "Shop"} | ${market_slug || "Rohtak"} | ${shop_address || ""}`,
          JSON.stringify({
            type: "market_shop", customer_id: customerId,
            market_slug: market_slug || "", category: category || "",
            email, shop_address: shop_address || "",
            opening_time: opening_time || "09:00", closing_time: closing_time || "21:00",
            icon: "🏪", platform: "digitalrohtak.online",
          })
        ]
      );
      scId = scRes.rows[0].id;
      await client.query(
        `INSERT INTO publishable_api_key_sales_channel (id, publishable_key_id, sales_channel_id, created_at, updated_at)
         VALUES ('paksc_' || replace(gen_random_uuid()::text,'-',''), 'apk_01KQAQCMSS80NKWCR6W4K08FN0', $1, now(), now())
         ON CONFLICT DO NOTHING`,
        [scId]
      );
    } else {
      await client.query(
        `UPDATE sales_channel SET name=$1, description=$2, metadata=metadata || $3, updated_at=now() WHERE id=$4`,
        [shop_name, `${category || "Shop"} | ${market_slug || "Rohtak"} | ${shop_address || ""}`,
         JSON.stringify({ category, market_slug, shop_address, opening_time, closing_time }), scId]
      );
    }

    const upsertRes = await client.query(
      `INSERT INTO dr_seller_profile
         (id, customer_id, sales_channel_id, shop_name, category, market_slug,
          gst_number, fssai_license, pan_number, shop_address, opening_time, closing_time,
          is_verified, is_active, created_at, updated_at)
       VALUES ('dsp_' || replace(gen_random_uuid()::text,'-',''), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,true,now(),now())
       ON CONFLICT (customer_id) DO UPDATE SET
         sales_channel_id=$2, shop_name=$3, category=$4, market_slug=$5,
         gst_number=$6, fssai_license=$7, pan_number=$8, shop_address=$9,
         opening_time=$10, closing_time=$11, updated_at=now(), deleted_at=NULL
       RETURNING *`,
      [customerId, scId, shop_name, category, market_slug,
       gst_number, fssai_license, pan_number, shop_address,
       opening_time || "09:00", closing_time || "21:00"]
    );

    // Auto-assign seller role
    await client.query(
      `INSERT INTO customer_group_customer (id, customer_id, customer_group_id, created_at, updated_at)
       VALUES ('cgc_' || gen_random_uuid()::text, $1, 'cg_seller', now(), now()) ON CONFLICT DO NOTHING`,
      [customerId]
    );
    await client.query(
      `UPDATE customer_group_customer SET deleted_at=NULL, updated_at=now()
       WHERE customer_id=$1 AND customer_group_id='cg_seller' AND deleted_at IS NOT NULL`,
      [customerId]
    );

    await client.query("COMMIT");
    return res.json({ seller_profile: upsertRes.rows[0], sales_channel_id: scId });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
