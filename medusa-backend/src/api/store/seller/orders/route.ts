/**
 * GET /store/seller/orders?channel={handle}&page=1&limit=20
 *
 * Lists orders associated with the seller's store, joined with DeliveryOrder
 * lifecycle status. Sorted by created_at descending.
 *
 * Requirements: 2.1, 2.4, 2.5, 2.6
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Pool } from "pg";
import { requireRole } from "../../../../lib/auth";
import { resolveSellerStore } from "../../../../lib/seller";
import type { ApiError } from "../../../../types/platform";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MEDUSA_URL = process.env.MEDUSA_INTERNAL_URL || "http://127.0.0.1:9000";
const MEDUSA_ADMIN_TOKEN = process.env.MEDUSA_ADMIN_TOKEN || "";

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-medusa-token": MEDUSA_ADMIN_TOKEN,
    Authorization: `Bearer ${MEDUSA_ADMIN_TOKEN}`,
  };
}

// ────────────────────────────────────────────────────────────────
// GET /store/seller/orders?channel={handle}&page=1&limit=20
// Requirements: 2.1, 2.4, 2.5, 2.6
// ────────────────────────────────────────────────────────────────

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const result = await requireRole(req, ["seller"]);
  if (result === null) return res.status(401).json({ error: "Unauthorized" } as ApiError);
  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" } as ApiError);
  const customerId = result;

  const {
    channel,
    page = "1",
    limit = "20",
  } = req.query as { channel?: string; page?: string; limit?: string };

  if (!channel) {
    return res.status(400).json({
      error: "channel query parameter is required",
      code: "MISSING_CHANNEL",
    } as ApiError);
  }

  const store = await resolveSellerStore(customerId, channel);
  if (!store) {
    return res.status(403).json({
      error: "You do not have access to this channel",
      code: "CHANNEL_FORBIDDEN",
    } as ApiError);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  try {
    // Query Medusa orders joined with DeliveryOrder lifecycle status
    // Orders are scoped to the seller's sales channel
    const { rows } = await pool.query(
      `SELECT
         o.id                      AS order_id,
         o.created_at,
         o.currency_code,
         o.metadata,
         o.display_id,
         -- customer name: prefer billing address, fallback to customer record
         COALESCE(
           oba.first_name || ' ' || oba.last_name,
           c.first_name || ' ' || c.last_name,
           o.email
         )                         AS customer_name,
         -- order total in smallest unit (already stored in smallest unit in Medusa v2)
         o.total,
         o.subtotal,
         -- lifecycle status from linked delivery order
         do_tbl.lifecycle_status,
         -- fall back to basic status if no delivery order yet
         do_tbl.status             AS delivery_status,
         do_tbl.id                 AS delivery_order_id
       FROM "order" o
       LEFT JOIN order_billing_address oba ON oba.order_id = o.id AND oba.deleted_at IS NULL
       LEFT JOIN customer c ON c.id = o.customer_id AND c.deleted_at IS NULL
       LEFT JOIN delivery_order do_tbl ON do_tbl.order_id = o.id AND do_tbl.deleted_at IS NULL
       WHERE o.sales_channel_id = $1
         AND o.deleted_at IS NULL
         AND o.status NOT IN ('archived')
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [store.sales_channel_id, limitNum, offset],
    );

    // Count query
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM "order" o
       WHERE o.sales_channel_id = $1
         AND o.deleted_at IS NULL
         AND o.status NOT IN ('archived')`,
      [store.sales_channel_id],
    );

    const orders = rows.map((row) => ({
      order_id: row.order_id,
      display_id: row.display_id,
      created_at: row.created_at,
      customer_name: (row.customer_name || "").trim() || "Customer",
      total: row.total ?? 0,
      subtotal: row.subtotal ?? 0,
      currency_code: row.currency_code || "INR",
      lifecycle_status: row.lifecycle_status ?? null,
      delivery_status: row.delivery_status ?? null,
      delivery_order_id: row.delivery_order_id ?? null,
    }));

    return res.json({
      orders,
      count: countRows[0]?.total ?? 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch orders" } as ApiError);
  }
}
