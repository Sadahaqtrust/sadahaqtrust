import { model } from "@medusajs/framework/utils";

/**
 * Lifecycle statuses for the Digital Rohtak delivery flow.
 * Parallel to the legacy `status` field (which tracks Fleetbase-style statuses).
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
export const DELIVERY_LIFECYCLE_STATUSES = [
  "broadcast",        // DeliveryOrder created and sent to online riders
  "assigned",         // A rider has accepted the order
  "ready_for_pickup", // Seller has marked the order ready
  "picked_up",        // Rider has confirmed pickup from seller
  "delivered",        // Rider has confirmed delivery to customer
  "complete",         // Final reconciliation done
  "unassigned",       // No rider accepted after 3 re-broadcasts
  "expired",          // Order timed out
] as const;

export type DeliveryLifecycleStatus = typeof DELIVERY_LIFECYCLE_STATUSES[number];

export const DeliveryOrder = model.define("delivery_order", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  fulfillment_type: model.enum(["quick_commerce", "scheduled", "pickup"]).default("quick_commerce"),
  status: model.enum([
    "pending", "dispatched", "en_route", "arrived",
    "picked_up", "completed", "cancelled", "failed",
  ]).default("pending"),

  // --- Platform lifecycle extension (Requirements 8.1–8.4) ---
  /** New platform lifecycle status; null on rows that pre-date this migration. */
  lifecycle_status: model.enum([...DELIVERY_LIFECYCLE_STATUSES]).nullable(),
  /** Tracks how many times this order has been re-broadcast to riders. */
  rebroadcast_count: model.number().default(0),
  /** Delivery fee (in INR paise) for the assigned rider. Null until assigned. */
  delivery_fee: model.float().nullable(),
  /** Medusa Sales Channel handle that this order belongs to. */
  seller_channel_id: model.text().nullable(),
  /** Timestamp of the last location update received for this order's rider. */
  last_location_at: model.dateTime().nullable(),
  // --- End platform lifecycle extension ---

  driver_id: model.text().nullable(),
  pickup_name: model.text(),
  pickup_address: model.text(),
  pickup_lat: model.float().nullable(),
  pickup_lng: model.float().nullable(),
  dropoff_name: model.text(),
  dropoff_address: model.text(),
  dropoff_lat: model.float().nullable(),
  dropoff_lng: model.float().nullable(),
  scheduled_at: model.dateTime().nullable(),
  tracking_number: model.text().nullable(),
  estimated_arrival: model.dateTime().nullable(),
  dispatched_at: model.dateTime().nullable(),
  picked_up_at: model.dateTime().nullable(),
  completed_at: model.dateTime().nullable(),
  cancelled_at: model.dateTime().nullable(),
  cod_amount: model.float().default(0),
  cod_currency: model.text().default("INR"),
  notes: model.text().nullable(),
  metadata: model.json().nullable(),
});
