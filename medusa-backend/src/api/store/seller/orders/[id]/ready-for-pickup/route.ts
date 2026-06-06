/**
 * PUT /store/seller/orders/{id}/ready-for-pickup
 *
 * Transitions the DeliveryOrder lifecycle_status from `pending` → `ready_for_pickup`.
 * Appends a TrackingEvent via the appendTrackingEvent helper.
 *
 * Business rules:
 * - Caller must be a seller
 * - DeliveryOrder must currently have lifecycle_status = "pending"
 *   (or the Medusa order status = "pending" when no lifecycle_status is set yet)
 * - Returns 409 if the current status is not `pending`
 *
 * Requirements: 2.3, 2.4
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Pool } from "pg";
import { requireRole } from "../../../../../../lib/auth";
import { resolveSellerStore } from "../../../../../../lib/seller";
import { appendTrackingEvent } from "../../../../../../lib/tracking";
import { DELIVERY_MODULE } from "../../../../../../modules/delivery";
import type { ApiError } from "../../../../../../types/platform";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const result = await requireRole(req, ["seller"]);
  if (result === null) return res.status(401).json({ error: "Unauthorized" } as ApiError);
  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" } as ApiError);
  const customerId = result;

  const { id } = req.params as { id: string };
  const channel: string = (req.query as any).channel || (req.body as any)?.channel || "";

  if (!channel) {
    return res.status(400).json({
      error: "channel is required",
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

  // Resolve the DeliveryOrder by Medusa order ID (id param is Medusa order id)
  // or directly by delivery order id — try both
  const { rows: doRows } = await pool.query(
    `SELECT do_tbl.id, do_tbl.lifecycle_status, do_tbl.driver_id, o.sales_channel_id
     FROM delivery_order do_tbl
     LEFT JOIN "order" o ON o.id = do_tbl.order_id
     WHERE (do_tbl.id = $1 OR do_tbl.order_id = $1)
       AND do_tbl.deleted_at IS NULL
     LIMIT 1`,
    [id],
  );

  if (!doRows.length) {
    return res.status(404).json({
      error: "Delivery order not found",
      code: "NOT_FOUND",
    } as ApiError);
  }

  const deliveryRow = doRows[0];

  // Verify the order belongs to the seller's channel
  if (deliveryRow.sales_channel_id && deliveryRow.sales_channel_id !== store.sales_channel_id) {
    return res.status(403).json({
      error: "Order not found or access denied",
      code: "ORDER_FORBIDDEN",
    } as ApiError);
  }

  // Validate current status is `pending` (Requirements 2.3, 2.4)
  // Accept both lifecycle_status = "pending" and lifecycle_status = null with Medusa order pending
  const currentLifecycle = deliveryRow.lifecycle_status;
  if (currentLifecycle !== null && currentLifecycle !== "pending") {
    return res.status(409).json({
      error: `Cannot mark as ready for pickup: current status is '${currentLifecycle}'`,
      code: "INVALID_STATUS_TRANSITION",
    } as ApiError);
  }

  try {
    // Update lifecycle_status to ready_for_pickup
    await pool.query(
      `UPDATE delivery_order
       SET lifecycle_status = 'ready_for_pickup', updated_at = NOW()
       WHERE id = $1`,
      [deliveryRow.id],
    );

    // Append TrackingEvent (Requirements 8.5, 8.10)
    const deliveryService = req.scope.resolve(DELIVERY_MODULE);
    await appendTrackingEvent(
      deliveryService,
      deliveryRow.id,
      "ready_for_pickup",
      deliveryRow.driver_id ?? null,
    );

    return res.json({
      success: true,
      order_id: id,
      delivery_order_id: deliveryRow.id,
      lifecycle_status: "ready_for_pickup",
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || "Failed to update order status",
    } as ApiError);
  }
}
