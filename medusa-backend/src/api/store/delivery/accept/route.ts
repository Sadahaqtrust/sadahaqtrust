/**
 * POST /store/delivery/accept
 *
 * Allows an online Rider to claim a broadcast DeliveryOrder.
 *
 * Uses a PostgreSQL advisory lock (pg_try_advisory_xact_lock) to prevent
 * two concurrent requests from assigning the same order to different Riders.
 * The lock is held for the duration of the database transaction; it is released
 * automatically when the transaction commits or rolls back.
 *
 * Request body:
 *   delivery_order_id  string  — ID of the DeliveryOrder to accept
 *   driver_id          string  — ID of the Driver (Rider) accepting the order
 *
 * Success (200):
 *   { assigned: true, delivery_order: { id, lifecycle_status, pickup_address,
 *                                        dropoff_address, delivery_fee } }
 *
 * Race condition (409):
 *   { reason: "already_claimed" | "expired" }
 *
 * On success the following side effects are applied atomically:
 *   1. DeliveryOrder.lifecycle_status → "assigned"
 *   2. Driver.status → "busy"
 *   3. Redis rider:active:{driverId}  set (TTL 3600s)
 *   4. DeliveryOrder ID removed from Redis broadcast:zone:{zoneId}
 *   5. "delivery.rider_accepted" event emitted (consumed by rider-accepted subscriber)
 *   6. TrackingEvent appended
 *
 * Requirements: 5.3, 5.4, 5.5, 5.8, 8.2
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { DELIVERY_MODULE } from "../../../../modules/delivery";
import { resolveCustomerFromToken } from "../../../../lib/auth";
import { appendTrackingEvent } from "../../../../lib/tracking";
import { Pool } from "pg";
import { createClient } from "redis";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Converts a string to a stable 32-bit integer suitable for use as an
 * advisory lock key. PostgreSQL advisory locks use bigint keys; we derive
 * one from the delivery_order_id string so the same order always maps to
 * the same lock key.
 */
function advisoryLockKey(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // convert to 32-bit integer
  }
  return Math.abs(hash);
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // ── Authentication ──────────────────────────────────────────────────────────
  const customerId = await resolveCustomerFromToken(req);
  if (!customerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ── Input validation ────────────────────────────────────────────────────────
  const { delivery_order_id, driver_id } = req.body as {
    delivery_order_id?: string;
    driver_id?: string;
  };

  if (!delivery_order_id) {
    return res.status(400).json({ error: "delivery_order_id is required", field: "delivery_order_id" });
  }
  if (!driver_id) {
    return res.status(400).json({ error: "driver_id is required", field: "driver_id" });
  }

  const deliveryService = req.scope.resolve(DELIVERY_MODULE);

  // ── Verify the Driver belongs to the authenticated customer ─────────────────
  const drivers = await deliveryService.listDrivers({ id: [driver_id] });
  if (drivers.length === 0) {
    return res.status(404).json({ error: "Driver not found" });
  }

  const driver = drivers[0];
  if (driver.user_id !== customerId) {
    return res.status(403).json({ error: "Forbidden: Driver does not belong to this user" });
  }

  // Driver must be available to accept orders
  if (driver.status !== "available") {
    return res.status(409).json({
      reason: "already_claimed",
      error: "Driver is not available to accept orders",
    });
  }

  // ── PostgreSQL advisory lock + acceptance logic ─────────────────────────────
  const lockKey = advisoryLockKey(delivery_order_id);
  const pgClient = await pool.connect();

  try {
    await pgClient.query("BEGIN");

    // Attempt to acquire an exclusive advisory lock for this DeliveryOrder.
    // pg_try_advisory_xact_lock returns false if another transaction holds the lock.
    const lockResult = await pgClient.query(
      "SELECT pg_try_advisory_xact_lock($1) AS acquired",
      [lockKey]
    );

    if (!lockResult.rows[0]?.acquired) {
      // Another request is currently processing this order
      await pgClient.query("ROLLBACK");
      return res.status(409).json({ reason: "already_claimed" });
    }

    // Re-fetch the DeliveryOrder inside the transaction for consistency
    const orders = await deliveryService.listDeliveryOrders({ id: [delivery_order_id] });
    if (orders.length === 0) {
      await pgClient.query("ROLLBACK");
      return res.status(404).json({ error: "DeliveryOrder not found" });
    }

    const order = orders[0];

    // Guard: only broadcast orders can be accepted
    if (order.lifecycle_status !== "broadcast") {
      await pgClient.query("ROLLBACK");

      const reason =
        order.lifecycle_status === "expired" ||
        order.lifecycle_status === "unassigned" ||
        order.lifecycle_status === null
          ? "expired"
          : "already_claimed";

      return res.status(409).json({ reason });
    }

    // ── Side effects ────────────────────────────────────────────────────────

    // 1. DeliveryOrder.lifecycle_status → "assigned", assign driver
    await deliveryService.updateDeliveryOrders([{
      id: delivery_order_id,
      lifecycle_status: "assigned",
      driver_id,
      dispatched_at: new Date(),
    }]);

    // 2. Driver.status → "busy"
    await deliveryService.updateDrivers([{
      id: driver_id,
      status: "busy",
    }]);

    // Commit the transaction — advisory lock is automatically released
    await pgClient.query("COMMIT");

    // ── Post-commit side effects (Redis + events + tracking) ────────────────
    // These run after the DB commit; failures are non-fatal (logged but not thrown)

    let redis: any = null;
    try {
      redis = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
      await redis.connect();

      // 3. Set rider:active:{driverId} in Redis (TTL 3600s)
      await redis.setEx(
        `rider:active:${driver_id}`,
        3600,
        JSON.stringify({ delivery_order_id, assigned_at: new Date().toISOString() })
      );

      // 4. Remove DeliveryOrder from broadcast:zone:{zoneId}
      if (driver.zone_id) {
        const broadcastKey = `broadcast:zone:${driver.zone_id}`;
        const raw = await redis.get(broadcastKey);
        if (raw) {
          let ids: string[] = [];
          try { ids = JSON.parse(raw); } catch { ids = []; }
          const filtered = ids.filter((id: string) => id !== delivery_order_id);
          if (filtered.length > 0) {
            // Preserve the existing TTL by using KEEPTTL (Redis 6+)
            await redis.set(broadcastKey, JSON.stringify(filtered), { KEEPTTL: true });
          } else {
            await redis.del(broadcastKey);
          }
        }
      }

      await redis.disconnect();
    } catch (redisErr: any) {
      // Redis failure must not roll back a committed DB transaction
      const logger = (req as any).scope?.resolve?.("logger") || console;
      logger.warn(`[accept] Redis side-effect failed: ${redisErr.message}`);
    }

    // 5. Emit "delivery.rider_accepted" event (consumed by rider-accepted subscriber)
    try {
      const eventBus = (req as any).scope.resolve("eventBusModuleService") as any;
      await eventBus.emit("delivery.rider_accepted", {
        delivery_order_id,
        driver_id,
        order_id: order.order_id,
        zone_id: driver.zone_id,
      });
    } catch (eventErr: any) {
      const logger = (req as any).scope?.resolve?.("logger") || console;
      logger.warn(`[accept] Event emission failed: ${eventErr.message}`);
    }

    // 6. Append TrackingEvent
    try {
      await appendTrackingEvent(deliveryService, delivery_order_id, "assigned", driver_id);
    } catch (trackErr: any) {
      const logger = (req as any).scope?.resolve?.("logger") || console;
      logger.warn(`[accept] TrackingEvent append failed: ${trackErr.message}`);
    }

    // ── Response ────────────────────────────────────────────────────────────
    return res.json({
      assigned: true,
      delivery_order: {
        id: delivery_order_id,
        lifecycle_status: "assigned",
        pickup_address: order.pickup_address,
        dropoff_address: order.dropoff_address,
        delivery_fee: order.delivery_fee,
      },
    });
  } catch (err: any) {
    try { await pgClient.query("ROLLBACK"); } catch { /* ignore */ }

    const logger = (req as any).scope?.resolve?.("logger") || console;
    logger.error(`[accept] Unexpected error: ${err.message}`);

    return res.status(500).json({ error: "Internal server error" });
  } finally {
    pgClient.release();
  }
}
