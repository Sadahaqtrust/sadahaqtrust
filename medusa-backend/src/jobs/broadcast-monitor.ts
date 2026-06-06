/**
 * Broadcast Monitor Scheduled Job
 *
 * Runs every 60 seconds and handles three responsibilities:
 *
 * 1. Re-broadcast — For each DeliveryOrder in `broadcast` status where the
 *    time since the last broadcast is > 10 minutes AND rebroadcast_count < 3:
 *    - Increment rebroadcast_count
 *    - Re-publish the order ID to Redis `broadcast:zone:{zoneId}`
 *    - Update metadata.re_broadcast_at to now
 *
 * 2. Expire after 3 re-broadcasts — For each `broadcast` order with
 *    rebroadcast_count >= 3 AND time since last broadcast > 10 minutes:
 *    - Set lifecycle_status = "unassigned"
 *    - Set metadata.admin_flag = "no_rider_available"
 *    - Emit notifications for Seller and Customer via the event bus
 *
 * 3. Location staleness — For each `assigned` order where the Driver's
 *    last_location_at is older than 5 minutes:
 *    - Reset lifecycle_status = "broadcast"
 *    - Set driver_id = null
 *    - Set Driver status = "available"
 *    - Append TrackingEvent "Rider reassignment in progress"
 *    - Update Redis order:status:{orderId}
 *
 * Requirements: 8.6, 8.7, 8.9
 */

import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createClient } from "redis";
import { DELIVERY_MODULE } from "../modules/delivery";
import { appendTrackingEvent } from "../lib/tracking";

/** Time (ms) a broadcast order must sit unaccepted before a re-broadcast fires. */
const REBROADCAST_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

/** Maximum number of re-broadcasts before the order is marked unassigned. */
const MAX_REBROADCASTS = 3;

/** Time (ms) of missing location updates before the rider is considered stale. */
const LOCATION_STALENESS_MS = 5 * 60 * 1000; // 5 minutes

/** Redis TTL (seconds) for broadcast:zone keys. */
const BROADCAST_TTL_S = 600;

/** Redis TTL (seconds) for order:status keys. */
const ORDER_STATUS_TTL_S = 900;

/** Resolves the Redis client (best-effort; returns null if Redis is unavailable). */
async function getRedis(): Promise<any | null> {
  try {
    const client = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
    await client.connect();
    return client;
  } catch {
    return null;
  }
}

/** Appends an order ID to the Redis broadcast list for a zone (RPUSH with TTL refresh). */
async function publishBroadcast(redis: any, zoneId: string, orderId: string): Promise<void> {
  if (!redis) return;
  const key = `broadcast:zone:${zoneId}`;
  await redis.rPush(key, orderId);
  await redis.expire(key, BROADCAST_TTL_S);
}

/** Writes the order lifecycle_status into the Redis order:status cache. */
async function updateOrderStatusCache(
  redis: any,
  orderId: string,
  lifecycleStatus: string,
): Promise<void> {
  if (!redis) return;
  const key = `order:status:${orderId}`;
  await redis.setEx(key, ORDER_STATUS_TTL_S, JSON.stringify({ lifecycle_status: lifecycleStatus, updated_at: new Date().toISOString() }));
}

export default async function broadcastMonitorJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const deliveryService = container.resolve(DELIVERY_MODULE);

  logger.info("[broadcast-monitor] Running broadcast monitor job");

  let redis: any = null;
  try {
    redis = await getRedis();
  } catch {
    logger.warn("[broadcast-monitor] Redis unavailable; broadcast publish will be skipped");
  }

  // Resolve event bus for notifications (best-effort)
  let eventBus: any = null;
  try {
    eventBus = container.resolve("eventBusModuleService") as any;
  } catch {
    logger.warn("[broadcast-monitor] Event bus unavailable; notifications will be skipped");
  }

  const now = new Date();
  const nowMs = now.getTime();

  // ────────────────────────────────────────────────────────────────────────────
  // Phase 1 & 2 — Handle `broadcast` status orders
  // ────────────────────────────────────────────────────────────────────────────
  let broadcastOrders: any[];
  try {
    broadcastOrders = await deliveryService.listDeliveryOrders({
      lifecycle_status: ["broadcast"],
    });
  } catch (err: any) {
    logger.error(`[broadcast-monitor] Failed to list broadcast orders: ${err.message}`);
    broadcastOrders = [];
  }

  logger.info(`[broadcast-monitor] Found ${broadcastOrders.length} order(s) in broadcast status`);

  for (const order of broadcastOrders) {
    try {
      // Determine the timestamp of the last broadcast event.
      // We use metadata.re_broadcast_at if present, otherwise fall back to
      // the order's created_at as a proxy for the initial broadcast time.
      const lastBroadcastAt: Date = order.metadata?.re_broadcast_at
        ? new Date(order.metadata.re_broadcast_at)
        : new Date(order.created_at);

      const timeSinceLastBroadcastMs = nowMs - lastBroadcastAt.getTime();

      if (timeSinceLastBroadcastMs <= REBROADCAST_THRESHOLD_MS) {
        // Not yet time to re-broadcast this order
        continue;
      }

      const currentRebroadcastCount: number = order.rebroadcast_count ?? 0;

      if (currentRebroadcastCount < MAX_REBROADCASTS) {
        // ── Phase 1: Re-broadcast ─────────────────────────────────────────
        const newRebroadcastCount = currentRebroadcastCount + 1;

        await deliveryService.updateDeliveryOrders([{
          id: order.id,
          rebroadcast_count: newRebroadcastCount,
          metadata: {
            ...(order.metadata ?? {}),
            re_broadcast_at: now.toISOString(),
          },
        }]);

        // Re-publish to Redis so online riders see the order again
        const zoneId = order.seller_channel_id || "default";
        await publishBroadcast(redis, zoneId, order.id);

        logger.info(
          `[broadcast-monitor] Re-broadcast order ${order.id} ` +
          `(attempt ${newRebroadcastCount}/${MAX_REBROADCASTS}, zone=${zoneId})`,
        );
      } else {
        // ── Phase 2: Expire after MAX_REBROADCASTS with no acceptance ─────
        await deliveryService.updateDeliveryOrders([{
          id: order.id,
          lifecycle_status: "unassigned",
          metadata: {
            ...(order.metadata ?? {}),
            admin_flag: "no_rider_available",
            unassigned_at: now.toISOString(),
          },
        }]);

        // Update Redis order status cache
        await updateOrderStatusCache(redis, order.id, "unassigned");

        logger.info(
          `[broadcast-monitor] Order ${order.id} set to unassigned after ${currentRebroadcastCount} re-broadcasts`,
        );

        // Emit notifications for Seller and Customer
        if (eventBus) {
          try {
            await eventBus.emit("delivery.no_rider_available", {
              delivery_order_id: order.id,
              order_id: order.order_id,
              seller_channel_id: order.seller_channel_id,
            });
            logger.info(
              `[broadcast-monitor] Emitted no_rider_available event for order ${order.id}`,
            );
          } catch (evtErr: any) {
            logger.error(
              `[broadcast-monitor] Failed to emit notification for order ${order.id}: ${evtErr.message}`,
            );
          }
        }
      }
    } catch (err: any) {
      logger.error(`[broadcast-monitor] Error processing broadcast order ${order.id}: ${err.message}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Phase 3 — Location staleness check on `assigned` orders
  // ────────────────────────────────────────────────────────────────────────────
  let assignedOrders: any[];
  try {
    assignedOrders = await deliveryService.listDeliveryOrders({
      lifecycle_status: ["assigned"],
    });
  } catch (err: any) {
    logger.error(`[broadcast-monitor] Failed to list assigned orders: ${err.message}`);
    assignedOrders = [];
  }

  logger.info(`[broadcast-monitor] Found ${assignedOrders.length} order(s) in assigned status`);

  for (const order of assignedOrders) {
    try {
      if (!order.driver_id) continue;

      // Fetch the Driver to check last_location_at
      const [driver] = await deliveryService.listDrivers({ id: [order.driver_id] });
      if (!driver) continue;

      // If the driver has no last_location_at, we cannot determine staleness —
      // skip to avoid false reassignments on newly assigned orders.
      if (!driver.last_location_at) continue;

      const locationAge = nowMs - new Date(driver.last_location_at).getTime();
      if (locationAge <= LOCATION_STALENESS_MS) continue;

      // ── Stale location detected — reassign to broadcast ──────────────────
      logger.info(
        `[broadcast-monitor] Driver ${order.driver_id} location stale for order ${order.id} ` +
        `(age=${Math.round(locationAge / 1000)}s). Resetting to broadcast.`,
      );

      const previousDriverId = order.driver_id;

      // Reset the delivery order
      await deliveryService.updateDeliveryOrders([{
        id: order.id,
        lifecycle_status: "broadcast",
        driver_id: null,
        metadata: {
          ...(order.metadata ?? {}),
          re_broadcast_at: now.toISOString(),
          reassignment_reason: "location_stale",
          previous_driver_id: previousDriverId,
        },
      }]);

      // Free the driver
      await deliveryService.updateDrivers([{
        id: previousDriverId,
        status: "available",
      }]);

      // Append TrackingEvent for the reassignment
      await appendTrackingEvent(deliveryService, order.id, "broadcast", null);
      // Also create a dedicated reassignment event with message
      await deliveryService.createTrackingEvents([{
        delivery_order_id: order.id,
        status: "broadcast",
        message: "Rider reassignment in progress",
        message_hi: "राइडर पुनर्नियुक्ति प्रगति में है",
      }]);

      // Re-publish to Redis broadcast list for the zone
      const zoneId = order.seller_channel_id || "default";
      await publishBroadcast(redis, zoneId, order.id);

      // Update the order:status Redis cache to reflect the reset
      await updateOrderStatusCache(redis, order.id, "broadcast");

      logger.info(
        `[broadcast-monitor] Order ${order.id} reassigned to broadcast; driver ${previousDriverId} set available`,
      );
    } catch (err: any) {
      logger.error(
        `[broadcast-monitor] Error processing location staleness for order ${order.id}: ${err.message}`,
      );
    }
  }

  // Disconnect Redis if we opened a connection
  if (redis) {
    try {
      await redis.disconnect();
    } catch {
      // best-effort cleanup
    }
  }

  logger.info("[broadcast-monitor] Job complete");
}

export const config = {
  name: "broadcast-monitor-job",
  /** Every 60 seconds. */
  schedule: "*/1 * * * *",
};
