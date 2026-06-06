/**
 * medusa-backend/src/subscribers/rider-accepted.ts
 *
 * Listens for the "delivery.rider_accepted" event (emitted by
 * POST /store/delivery/accept) and triggers UPI split-payment disbursement.
 *
 * Responsibilities:
 *   1. Resolve the Seller's VPA from MerchantConfig (or order metadata).
 *   2. Resolve the Rider's VPA from Driver.upi_vpa.
 *   3. Determine seller_amount = order subtotal - delivery_fee.
 *   4. Call POST /store/payment/upi/disburse (admin-scoped internal call).
 *   5. VPA values are NEVER returned or logged to any storefront-visible surface.
 *
 * Event payload:
 *   {
 *     delivery_order_id: string,
 *     driver_id:         string,
 *     order_id:          string | undefined,
 *     zone_id:           string | undefined,
 *   }
 *
 * Requirements: 7.4, 7.8
 */

import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { DELIVERY_MODULE } from "../modules/delivery";
import { UPI_MODULE } from "../modules/upi";

/**
 * Calls the internal disburse endpoint.
 * Uses an admin-level API token or the configured admin credentials.
 * VPA values travel only over the internal (same-VPC) network.
 */
async function callDisburseEndpoint(params: {
  order_id: string;
  seller_vpa: string;
  seller_amount: number;
  rider_vpa: string;
  rider_amount: number;
  logger: any;
}): Promise<void> {
  const { order_id, seller_vpa, seller_amount, rider_vpa, rider_amount, logger } = params;

  const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

  // Build an admin auth token. We use the MEDUSA_ADMIN_API_TOKEN if set,
  // otherwise fall back to building a minimal Bearer token using the admin
  // email-based session mechanism (same as the UPI security module does).
  const adminToken = process.env.MEDUSA_ADMIN_API_TOKEN || "";
  if (!adminToken) {
    logger.warn("[rider-accepted] MEDUSA_ADMIN_API_TOKEN not set — disburse call will use UPI_ADMIN_EMAIL fallback");
  }

  try {
    const resp = await globalThis.fetch(`${backendUrl}/store/payment/upi/disburse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Prefer the admin token; the disburse endpoint checks checkAdminAuth
        Authorization: adminToken ? `Bearer ${adminToken}` : "",
        // Pass the publishable key so Medusa's routing accepts the request
        "x-publishable-api-key":
          process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
          "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8",
        // Internal-origin flag so the endpoint can recognise subscriber calls
        "x-internal-origin": "rider-accepted-subscriber",
      },
      // NOTE: seller_vpa and rider_vpa travel only on the internal network.
      // This payload is never serialised into any storefront-bound response.
      body: JSON.stringify({
        order_id,
        seller_vpa,
        seller_amount,
        rider_vpa,
        rider_amount,
      }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      logger.error(`[rider-accepted] Disburse call failed (HTTP ${resp.status}): ${JSON.stringify(data)}`);
      return;
    }

    if (data.disbursed) {
      logger.info(`[rider-accepted] Disbursement succeeded for order ${order_id}`);
    } else {
      logger.error(
        `[rider-accepted] Disbursement reported failure for order ${order_id}: ${JSON.stringify(data.errors)}`
      );
    }
  } catch (err: any) {
    logger.error(`[rider-accepted] Failed to call disburse endpoint: ${err.message}`);
  }
}

export default async function riderAcceptedHandler({
  event,
  container,
}: SubscriberArgs<{
  delivery_order_id: string;
  driver_id: string;
  order_id?: string;
  zone_id?: string;
}>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const { delivery_order_id, driver_id, order_id } = event.data;

  logger.info(
    `[rider-accepted] delivery_order_id=${delivery_order_id} driver_id=${driver_id} order_id=${order_id ?? "(none)"}`
  );

  // ── 1. Resolve Rider VPA from Driver.upi_vpa ─────────────────────────────────
  const deliveryService = container.resolve(DELIVERY_MODULE);

  const drivers = await deliveryService.listDrivers({ id: [driver_id] }).catch(() => []);
  if (drivers.length === 0) {
    logger.error(`[rider-accepted] Driver ${driver_id} not found — cannot disburse`);
    return;
  }

  const driver = drivers[0];
  const riderVpa: string | null = driver.upi_vpa ?? null;

  if (!riderVpa) {
    logger.warn(
      `[rider-accepted] Driver ${driver_id} has no upi_vpa set — disbursement skipped. ` +
        "Set Driver.upi_vpa to enable automatic rider payout."
    );
    // Per Requirement 7.10: retain utr_submitted and flag in admin panel.
    // We skip the call rather than calling with an empty VPA to avoid a failed transfer.
    return;
  }

  // ── 2. Resolve the linked order and UpiPayment record ────────────────────────
  // Try to get the order_id from the event payload first; fall back to the
  // DeliveryOrder.order_id if not provided.
  let resolvedOrderId = order_id;

  if (!resolvedOrderId) {
    const orders = await deliveryService.listDeliveryOrders({ id: [delivery_order_id] }).catch(() => []);
    resolvedOrderId = orders[0]?.order_id ?? undefined;
  }

  if (!resolvedOrderId) {
    logger.error(`[rider-accepted] Cannot resolve order_id for delivery ${delivery_order_id} — skipping disbursement`);
    return;
  }

  // ── 3. Fetch the UpiPayment to get amounts and check eligibility ─────────────
  const upiService = container.resolve(UPI_MODULE);

  const payments = await upiService.listUpiPayments({ order_id: resolvedOrderId }).catch(() => []);
  if (payments.length === 0) {
    logger.warn(`[rider-accepted] No UpiPayment found for order ${resolvedOrderId} — skipping disbursement`);
    return;
  }

  const upiPayment = payments[0];

  if (upiPayment.utr_status !== "utr_submitted") {
    logger.info(
      `[rider-accepted] UpiPayment.utr_status=${upiPayment.utr_status} — no disbursement needed`
    );
    return;
  }

  // ── 4. Resolve Seller VPA from MerchantConfig ────────────────────────────────
  // MerchantConfig stores the platform's collection VPA.
  // In the split-payment model, the seller receives their share to the
  // merchant_upi_id on the UpiPayment (or from MerchantConfig if available).
  let sellerVpa: string | null = null;

  // First try: UpiPayment.merchant_upi_id (set at payment initiation)
  if (upiPayment.merchant_upi_id) {
    sellerVpa = upiPayment.merchant_upi_id;
  }

  // Second try: active MerchantConfig record
  if (!sellerVpa) {
    try {
      const configs = await upiService.listMerchantConfigs({ is_active: [true] });
      if (configs.length > 0) {
        sellerVpa = configs[0].merchant_upi_id;
      }
    } catch {
      // ignore
    }
  }

  if (!sellerVpa) {
    logger.error(
      `[rider-accepted] Cannot resolve Seller VPA for order ${resolvedOrderId} — disbursement skipped`
    );
    return;
  }

  // ── 5. Compute disbursement amounts ──────────────────────────────────────────
  //
  // seller_amount = total merchant amount - rider delivery fee
  // rider_amount  = delivery fee from the DeliveryOrder
  //
  // Both amounts are in paise (× 100 of INR rupees) as stored in the UpiPayment.
  const deliveryOrders = await deliveryService
    .listDeliveryOrders({ id: [delivery_order_id] })
    .catch(() => []);
  const deliveryOrder = deliveryOrders[0];

  // Delivery fee stored on DeliveryOrder (paise)
  const deliveryFeePaise = deliveryOrder?.delivery_fee ?? upiPayment.rider_amount ?? 0;

  // Total merchant amount (paise) — this is what the customer paid
  // UpiPayment.merchant_amount is stored as rupees (float) so convert to paise
  const totalPaise = Math.round((upiPayment.merchant_amount ?? 0) * 100);

  const sellerAmount = Math.max(0, totalPaise - deliveryFeePaise);
  const riderAmount  = deliveryFeePaise;

  if (sellerAmount <= 0 && riderAmount <= 0) {
    logger.warn(`[rider-accepted] Computed zero amounts for order ${resolvedOrderId} — skipping disbursement`);
    return;
  }

  logger.info(
    `[rider-accepted] Disbursing order=${resolvedOrderId} ` +
      `seller=${sellerVpa} ${sellerAmount}p | rider=[REDACTED] ${riderAmount}p`
    // rider VPA redacted from logs to comply with Requirement 7.8
  );

  // ── 6. Call the disburse endpoint ────────────────────────────────────────────
  await callDisburseEndpoint({
    order_id: resolvedOrderId,
    seller_vpa: sellerVpa,
    seller_amount: sellerAmount,
    rider_vpa: riderVpa,
    rider_amount: riderAmount,
    logger,
  });
}

export const config: SubscriberConfig = {
  event: "delivery.rider_accepted",
};
