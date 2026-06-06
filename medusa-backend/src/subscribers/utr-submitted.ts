/**
 * medusa-backend/src/subscribers/utr-submitted.ts
 *
 * Listens for the "upi.utr_submitted" event (emitted by POST /store/payment/upi/submit-utr)
 * and performs Phase 2 of the UPI deferred-commit flow:
 *
 *   1. Complete the cart using Medusa's cart-completion workflow so that a
 *      Medusa Order is created and linked to the UpiPayment record.
 *   2. Create a DeliveryOrder with lifecycle_status = "broadcast".
 *   3. Publish the DeliveryOrder ID to Redis broadcast:zone:{zoneId} (TTL 600 s).
 *
 * Event payload (emitted by submit-utr route):
 *   { upi_payment_id: string, cart_id: string, customer_id: string }
 *
 * Requirements: 7.3, 8.1
 */

import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { UPI_MODULE } from "../modules/upi";
import { DELIVERY_MODULE } from "../modules/delivery";
import { createClient } from "redis";

/** Default pickup location for all Rohtak orders. */
const DEFAULT_PICKUP = {
  name: "Digital Rohtak Warehouse",
  address: "Sector 1, Model Town, Rohtak, Haryana 124001",
  lat: 28.8955,
  lng: 76.6066,
};

/** TTL (seconds) for the broadcast:zone:{zoneId} Redis key. */
const BROADCAST_TTL = 600;

/**
 * Resolves the default active ServiceZone for Rohtak.
 * Returns null if no zones exist (broadcasts will still work but zoneId will be "default").
 */
async function resolveDefaultZoneId(deliveryService: any): Promise<string | null> {
  try {
    const zones = await deliveryService.listServiceZones({ is_active: [true] });
    return zones.length > 0 ? zones[0].id : null;
  } catch {
    return null;
  }
}

/**
 * Completes the cart via the Medusa store cart-completion endpoint and
 * returns the resulting Order ID, or null on failure.
 *
 * We call the internal store API rather than resolving the workflow directly
 * so that all Medusa lifecycle hooks (payment capture, inventory reservation,
 * notification events) are triggered in the normal way.
 */
async function completeCart(cartId: string, logger: any): Promise<string | null> {
  try {
    const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";
    const publishableKey =
      process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
      "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

    const resp = await globalThis.fetch(`${backendUrl}/store/carts/${cartId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": publishableKey,
      },
    });

    if (!resp.ok) {
      const body = await resp.text();
      logger.warn(`[utr-submitted] Cart completion returned ${resp.status}: ${body}`);
      return null;
    }

    const data = await resp.json();
    // Medusa v2 returns { type: "order", order: { id, ... } } on success
    const orderId = data?.order?.id ?? data?.id ?? null;
    if (!orderId) {
      logger.warn(`[utr-submitted] Cart completion response missing order.id: ${JSON.stringify(data)}`);
    }
    return orderId ?? null;
  } catch (err: any) {
    logger.error(`[utr-submitted] Cart completion failed for ${cartId}: ${err.message}`);
    return null;
  }
}

export default async function utrSubmittedHandler({
  event,
  container,
}: SubscriberArgs<{ upi_payment_id: string; cart_id: string; customer_id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const { upi_payment_id, cart_id, customer_id } = event.data;

  logger.info(`[utr-submitted] Processing upi_payment_id=${upi_payment_id} cart_id=${cart_id}`);

  // ── Fetch UpiPayment to confirm it is still in utr_submitted state ──────────
  const upiService = container.resolve(UPI_MODULE);

  let upiPayment: any;
  try {
    const payments = await upiService.listUpiPayments({ id: [upi_payment_id] });
    if (payments.length === 0) {
      logger.warn(`[utr-submitted] UpiPayment ${upi_payment_id} not found — skipping`);
      return;
    }
    upiPayment = payments[0];
  } catch (err: any) {
    logger.error(`[utr-submitted] Failed to fetch UpiPayment: ${err.message}`);
    return;
  }

  // Idempotency guard: if an order_id is already linked, the cart was completed
  // on a previous (possibly duplicate) event invocation.
  if (upiPayment.order_id) {
    logger.info(`[utr-submitted] UpiPayment already has order_id=${upiPayment.order_id} — skipping duplicate`);
    return;
  }

  if (upiPayment.utr_status !== "utr_submitted") {
    logger.warn(
      `[utr-submitted] UpiPayment ${upi_payment_id} has status=${upiPayment.utr_status}, expected utr_submitted — skipping`
    );
    return;
  }

  // ── Step 1: Complete the cart → create Medusa Order ─────────────────────────
  const orderId = await completeCart(cart_id, logger);

  if (!orderId) {
    logger.error(`[utr-submitted] Could not complete cart ${cart_id} — aborting broadcast`);
    return;
  }

  logger.info(`[utr-submitted] Cart ${cart_id} completed → order ${orderId}`);

  // Link the order_id back onto the UpiPayment record
  try {
    await upiService.updateUpiPayments(
      { id: upi_payment_id },
      { order_id: orderId }
    );
  } catch (err: any) {
    logger.warn(`[utr-submitted] Could not update UpiPayment.order_id: ${err.message}`);
    // Non-fatal — proceed with broadcast
  }

  // ── Step 2: Fetch order details for DeliveryOrder creation ──────────────────
  const deliveryService = container.resolve(DELIVERY_MODULE);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  let order: any;
  try {
    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "total",
        "metadata",
        "shipping_address.*",
        "items.*",
      ],
      filters: { id: orderId },
    });
    order = data[0];
  } catch (err: any) {
    logger.error(`[utr-submitted] Failed to fetch order ${orderId}: ${err.message}`);
    // Fall back to minimal info
    order = { id: orderId };
  }

  // Resolve zone from seller_channel_id or use default
  const zoneId = (order?.metadata?.zone_id as string | undefined) ?? await resolveDefaultZoneId(deliveryService) ?? "default";

  // Build dropoff details from shipping address
  const addr = order?.shipping_address;
  const dropoffName =
    addr ? `${addr.first_name || ""} ${addr.last_name || ""}`.trim() : (order?.email ?? "Customer");
  const dropoffAddress = addr
    ? `${addr.address_1 || ""}, ${addr.city || "Rohtak"}, ${addr.country_code?.toUpperCase() || "IN"}`
    : "Rohtak, Haryana";

  // Compute delivery fee from UpiPayment.rider_amount (stored in paise * 100 in UPI but let's use as-is)
  const deliveryFee = upiPayment.rider_amount ?? 0;

  // ── Step 3: Create DeliveryOrder with lifecycle_status = "broadcast" ─────────
  let deliveryOrderId: string;
  try {
    // Check if a DeliveryOrder already exists for this order_id (idempotency)
    const existing = await deliveryService.listDeliveryOrders({ order_id: [orderId] });
    if (existing.length > 0) {
      deliveryOrderId = existing[0].id;
      logger.info(`[utr-submitted] DeliveryOrder already exists: ${deliveryOrderId}`);
    } else {
      const [newDelivery] = await deliveryService.createDeliveryOrders([{
        order_id: orderId,
        fulfillment_type: "quick_commerce",
        status: "pending",
        lifecycle_status: "broadcast",
        pickup_name: DEFAULT_PICKUP.name,
        pickup_address: DEFAULT_PICKUP.address,
        pickup_lat: DEFAULT_PICKUP.lat,
        pickup_lng: DEFAULT_PICKUP.lng,
        dropoff_name: dropoffName || "Customer",
        dropoff_address: dropoffAddress,
        delivery_fee: deliveryFee,
        seller_channel_id: (order?.metadata?.channel_handle as string | undefined) ?? null,
        notes: order?.display_id ? `Order #${order.display_id}` : `Order ${orderId}`,
        tracking_number:
          "DR" +
          Date.now().toString(36).toUpperCase() +
          Math.random().toString(36).substring(2, 5).toUpperCase(),
        metadata: {
          store_name: (order?.metadata?.store_name as string | undefined) ?? DEFAULT_PICKUP.name,
          zone_id: zoneId,
          upi_payment_id,
        },
      }]);

      deliveryOrderId = newDelivery.id;
      logger.info(`[utr-submitted] Created DeliveryOrder ${deliveryOrderId} (lifecycle_status=broadcast)`);

      // Append initial TrackingEvent
      try {
        await deliveryService.createTrackingEvents([{
          delivery_order_id: deliveryOrderId,
          status: "broadcast",
          message: "Order confirmed, finding rider",
          message_hi: "ऑर्डर कन्फर्म, राइडर खोज रहे हैं",
        }]);
      } catch {
        // Best-effort — do not block
      }
    }
  } catch (err: any) {
    logger.error(`[utr-submitted] Failed to create DeliveryOrder: ${err.message}`);
    return;
  }

  // Store delivery_order_id on the order metadata for tracking
  try {
    const orderModule = container.resolve(Modules.ORDER);
    const currentOrder = await orderModule.retrieveOrder(orderId).catch(() => null);
    await orderModule.updateOrders([{
      id: orderId,
      metadata: {
        ...(currentOrder?.metadata as object ?? {}),
        delivery_order_id: deliveryOrderId,
      },
    }]);
  } catch {
    // Non-fatal
  }

  // ── Step 4: Publish to Redis broadcast:zone:{zoneId} (TTL 600s) ─────────────
  let redis: any = null;
  try {
    redis = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
    await redis.connect();

    const broadcastKey = `broadcast:zone:${zoneId}`;
    const existing = await redis.get(broadcastKey);

    let ids: string[] = [];
    if (existing) {
      try { ids = JSON.parse(existing); } catch { ids = []; }
    }

    // Idempotency: don't double-add
    if (!ids.includes(deliveryOrderId)) {
      ids.push(deliveryOrderId);
    }

    await redis.setEx(broadcastKey, BROADCAST_TTL, JSON.stringify(ids));

    logger.info(
      `[utr-submitted] Published DeliveryOrder ${deliveryOrderId} to ${broadcastKey} (TTL ${BROADCAST_TTL}s)`
    );
  } catch (err: any) {
    logger.error(`[utr-submitted] Redis publish failed: ${err.message}`);
    // Non-fatal — the broadcast monitor job will re-publish on next cycle
  } finally {
    if (redis) {
      try { await redis.disconnect(); } catch { /* ignore */ }
    }
  }
}

export const config: SubscriberConfig = {
  event: "upi.utr_submitted",
};
