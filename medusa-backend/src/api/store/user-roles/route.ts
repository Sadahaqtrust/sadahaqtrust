import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /store/user-roles
// Returns all role definitions from customer_group table
// Optionally filter: ?types=customer,seller
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { types } = req.query as { types?: string };
  try {
    let query = `SELECT id, name, metadata FROM customer_group WHERE deleted_at IS NULL AND metadata->>'type' IS NOT NULL ORDER BY metadata->>'type'`;
    const rows = (await pool.query(query)).rows;

    let roles = rows.map(r => ({
      id: r.id,
      type: r.metadata?.type,
      label_hi: r.metadata?.label_hi,
      label_en: r.metadata?.label_en,
      icon: r.metadata?.icon,
      desc_hi: r.metadata?.desc_hi,
      desc_en: r.metadata?.desc_en,
    }));

    if (types) {
      const allowed = types.split(",").map(t => t.trim());
      roles = roles.filter(r => allowed.includes(r.type));
    }

    return res.json({ roles });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
