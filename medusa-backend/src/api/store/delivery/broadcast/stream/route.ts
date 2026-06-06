/**
 * GET /store/delivery/broadcast/stream?zone_id={zoneId}
 *
 * Server-Sent Events endpoint for real-time order broadcast to online Riders.
 *
 * Pre-conditions:
 *   - Requesting Driver must have status = "available"
 *   - Driver.zone_id must match the requested zone_id query param
 *
 * Behaviour:
 *   - Opens an SSE connection (text/event-stream)
 *   - Polls Redis broadcast:zone:{zoneId} every 2 seconds for new DeliveryOrder IDs
 *   - Enriches each DeliveryOrder ID with store_name, pickup_address,
 *     estimated_distance_km, and delivery_fee from the DeliveryOrder record
 *   - Pushes BroadcastEvent payloads to the client
 *   - Sends a heartbeat comment every 30 seconds to keep the connection alive
 *   - Deduplicates events so the same order is not pushed twice per connection
 *
 * SSE Event shape (BroadcastEvent):
 *   {
 *     type: "new_order",
 *     delivery_order_id: string,
 *     store_name: string,
 *     pickup_address: string,
 *     estimated_distance_km: number,
 *     delivery_fee: number   // INR paise
 *   }
 *
 * Requirements: 5.1, 5.2
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { DELIVERY_MODULE } from "../../../../../modules/delivery";
import { resolveCustomerFromToken } from "../../../../../lib/auth";
import { createClient } from "redis";

// Poll Redis every 2 seconds for new broadcast entries
const POLL_INTERVAL_MS = 2_000;

// Send a heartbeat comment every 30 seconds to keep the TCP connection alive
const HEARTBEAT_INTERVAL_MS = 30_000;

// Maximum connection lifetime (5 minutes) — client re-connects automatically
const MAX_CONNECTION_MS = 5 * 60 * 1000;

/**
 * Haversine distance between two lat/lng pairs, in kilometres.
 */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // ── Authentication ──────────────────────────────────────────────────────────
  const customerId = await resolveCustomerFromToken(req);
  if (!customerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ── Query-param validation ──────────────────────────────────────────────────
  const { zone_id: zoneId } = req.query as Record<string, string>;
  if (!zoneId) {
    return res.status(400).json({ error: "zone_id query parameter is required", field: "zone_id" });
  }

  // ── Driver validation ───────────────────────────────────────────────────────
  const deliveryService = req.scope.resolve(DELIVERY_MODULE);
  const drivers = await deliveryService.listDrivers({ user_id: [customerId] });

  if (drivers.length === 0) {
    return res.status(403).json({
      error: "No Driver record found for this user",
      code: "DRIVER_NOT_FOUND",
    });
  }

  const driver = drivers[0];

  // Must be online (available) — Requirement 5.1
  if (driver.status !== "available") {
    return res.status(403).json({
      error: "Driver must be online (status=available) to receive broadcasts",
      code: "DRIVER_NOT_AVAILABLE",
    });
  }

  // zone_id must match — Requirement 5.1
  if (driver.zone_id !== zoneId) {
    return res.status(403).json({
      error: `Driver is assigned to zone '${driver.zone_id}', not '${zoneId}'`,
      code: "ZONE_MISMATCH",
    });
  }

  // ── Open SSE stream ─────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable Nginx buffering

  // Write initial comment to flush headers to the client immediately
  res.write(": connected\n\n");

  // ── Redis client for this connection ────────────────────────────────────────
  let redis: any = null;
  try {
    redis = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
    await redis.connect();
  } catch {
    // Redis unavailable — close gracefully
    res.write("event: error\ndata: {\"error\":\"Broadcast service unavailable\"}\n\n");
    return res.end();
  }

  // Track which order IDs have already been pushed to this connection
  const sentOrderIds = new Set<string>();

  let pollTimer: NodeJS.Timeout | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let connectionTimer: NodeJS.Timeout | null = null;
  let closed = false;

  const cleanup = async () => {
    if (closed) return;
    closed = true;
    if (pollTimer) clearInterval(pollTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (connectionTimer) clearTimeout(connectionTimer);
    try {
      await redis.disconnect();
    } catch {
      // ignore
    }
  };

  req.on("close", cleanup);
  req.on("aborted", cleanup);

  // ── Poll Redis for new broadcasts ───────────────────────────────────────────
  const poll = async () => {
    if (closed) return;

    try {
      // Re-validate driver is still available on each poll (could have gone offline)
      const [freshDriver] = await deliveryService.listDrivers({ id: [driver.id] });
      if (!freshDriver || freshDriver.status !== "available") {
        // Driver went offline — close the stream
        if (!closed) {
          res.write("event: offline\ndata: {\"reason\":\"Driver went offline\"}\n\n");
          await cleanup();
          res.end();
        }
        return;
      }

      const raw = await redis.get(`broadcast:zone:${zoneId}`);
      if (!raw) return;

      let orderIds: string[] = [];
      try {
        orderIds = JSON.parse(raw);
      } catch {
        return;
      }

      if (!Array.isArray(orderIds)) return;

      for (const orderId of orderIds) {
        if (sentOrderIds.has(orderId)) continue; // already pushed this connection

        // Fetch the DeliveryOrder to build the event payload
        const orders = await deliveryService.listDeliveryOrders({ id: [orderId] });
        if (orders.length === 0) continue;

        const order = orders[0];

        // Only broadcast orders that are still in "broadcast" status
        if (order.lifecycle_status !== "broadcast") continue;

        // Compute estimated_distance_km using driver's last known location
        let estimated_distance_km = 0;
        try {
          const driverLoc = await deliveryService.getDriverLocation(driver.id);
          if (driverLoc && order.pickup_lat && order.pickup_lng) {
            estimated_distance_km = parseFloat(
              haversine(driverLoc.lat, driverLoc.lng, order.pickup_lat, order.pickup_lng).toFixed(2)
            );
          }
        } catch {
          // Distance is best-effort
        }

        const event = {
          type: "new_order",
          delivery_order_id: order.id,
          store_name: (order.metadata as any)?.store_name || order.pickup_name || "Store",
          pickup_address: order.pickup_address,
          estimated_distance_km,
          delivery_fee: order.delivery_fee ?? 0,
        };

        res.write(`event: broadcast\ndata: ${JSON.stringify(event)}\n\n`);
        sentOrderIds.add(orderId);
      }
    } catch {
      // Ignore transient errors — next poll will retry
    }
  };

  // ── Timers ──────────────────────────────────────────────────────────────────
  // Start polling immediately, then every POLL_INTERVAL_MS
  await poll();
  pollTimer = setInterval(poll, POLL_INTERVAL_MS);

  // Heartbeat: send an SSE comment to prevent proxy/NAT timeouts
  heartbeatTimer = setInterval(() => {
    if (!closed) {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Max connection lifetime — force client to reconnect (EventSource does this automatically)
  connectionTimer = setTimeout(async () => {
    if (!closed) {
      res.write("event: reconnect\ndata: {\"reason\":\"Max connection time reached\"}\n\n");
      await cleanup();
      res.end();
    }
  }, MAX_CONNECTION_MS);
}
