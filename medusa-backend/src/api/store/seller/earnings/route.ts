/**
 * GET /store/seller/earnings?channel={handle}&from={date}&to={date}
 *
 * Computes seller earnings by summing order_subtotal of all `complete`
 * DeliveryOrders linked to the seller's sales channel.
 *
 * Query params:
 *   channel  (required) Sales Channel handle
 *   from     (optional) Start date ISO 8601 — inclusive
 *   to       (optional) End date ISO 8601 — inclusive
 *
 * Response:
 *   { total: number, currency: "INR", items: SellerEarningsItem[] }
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Pool } from "pg";
import { requireRole } from "../../../../lib/auth";
import { resolveSellerStore } from "../../../../lib/seller";
import type { ApiError, SellerEarningsResponse, SellerEarningsItem } from "../../../../types/platform";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const result = await requireRole(req, ["seller"]);
  if (result === null) return res.status(401).json({ error: "Unauthorized" } as ApiError);
  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" } as ApiError);
  const customerId = result;

  const { channel, from, to } = req.query as {
    channel?: string;
    from?: string;
    to?: string;
  };

  if (!channel) {
    return res.status(400).json({
      error: "channel query parameter is required",
      code: "MISSING_CHANNEL",
    } as ApiError);
  }

  // Validate date range if provided
  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({
        error: "Invalid date format. Use ISO 8601 (e.g. 2024-01-01)",
        code: "INVALID_DATE",
        field: "from",
      } as ApiError);
    }
    if (fromDate > toDate) {
      return res.status(400).json({
        error: "Start date must be on or before end date",
        code: "INVALID_DATE_RANGE",
        field: "from",
      } as ApiError);
    }
  } else if (from && !to) {
    // Only from provided — validate it
    if (isNaN(new Date(from).getTime())) {
      return res.status(400).json({
        error: "Invalid from date format",
        code: "INVALID_DATE",
        field: "from",
      } as ApiError);
    }
  } else if (to && !from) {
    if (isNaN(new Date(to).getTime())) {
      return res.status(400).json({
        error: "Invalid to date format",
        code: "INVALID_DATE",
        field: "to",
      } as ApiError);
    }
  }

  const store = await resolveSellerStore(customerId, channel);
  if (!store) {
    return res.status(403).json({
      error: "You do not have access to this channel",
      code: "CHANNEL_FORBIDDEN",
    } as ApiError);
  }

  try {
    // Build date filter clause
    const params: any[] = [store.sales_channel_id];
    let dateClause = "";

    if (from) {
      params.push(from);
      // Inclusive of start: from beginning of that day
      dateClause += ` AND do_tbl.completed_at >= $${params.length}::date`;
    }
    if (to) {
      params.push(to);
      // Inclusive of end: up to end of that day
      dateClause += ` AND do_tbl.completed_at < ($${params.length}::date + INTERVAL '1 day')`;
    }

    // Sum order subtotal from `complete` delivery orders in seller's channel
    // order.subtotal is stored in smallest currency unit in Medusa v2
    const { rows } = await pool.query(
      `SELECT
         do_tbl.id                  AS delivery_order_id,
         do_tbl.order_id,
         do_tbl.completed_at,
         COALESCE(o.subtotal, 0)    AS subtotal
       FROM delivery_order do_tbl
       LEFT JOIN "order" o ON o.id = do_tbl.order_id
       WHERE o.sales_channel_id = $1
         AND do_tbl.lifecycle_status = 'complete'
         AND do_tbl.deleted_at IS NULL
         AND o.deleted_at IS NULL
         ${dateClause}
       ORDER BY do_tbl.completed_at DESC NULLS LAST`,
      params,
    );

    const items: SellerEarningsItem[] = rows.map((row) => ({
      order_id: row.order_id,
      completion_date: row.completed_at ? new Date(row.completed_at).toISOString() : "",
      subtotal: Number(row.subtotal) || 0,
    }));

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    const response: SellerEarningsResponse = {
      total,
      currency: "INR",
      items,
    };

    return res.json(response);
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || "Failed to compute earnings",
    } as ApiError);
  }
}
