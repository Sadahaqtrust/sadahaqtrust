/**
 * UTR Expiry Scheduled Job
 *
 * Runs every 2 minutes. Finds UpiPayment records that are still in `pending`
 * status but whose `expires_at` timestamp has already elapsed, then:
 *   1. Marks each payment as `expired`
 *   2. Cancels the linked Medusa Order (if present) via the Order module
 *   3. Logs an audit entry for each expiry
 *
 * Requirements: 7.6
 */

import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { UPI_MODULE } from "../modules/upi";

export default async function utrExpiryJob(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const upiService = container.resolve(UPI_MODULE);

  logger.info("[utr-expiry] Running UTR expiry check");

  // ── 1. Query UpiPayment rows that are pending AND past their expiry ───────
  // MedusaService generated list methods accept a filter object.  We list
  // all pending records and filter by expires_at in application code because
  // the generated MedusaService filter API does not support `lt` operators
  // out of the box without a custom repository.
  let pendingPayments: any[];
  try {
    pendingPayments = await upiService.listUpiPayments({ utr_status: ["pending"] });
  } catch (err: any) {
    logger.error(`[utr-expiry] Failed to query pending payments: ${err.message}`);
    return;
  }

  const now = new Date();
  const expired = pendingPayments.filter(
    (p: any) => p.expires_at && new Date(p.expires_at) < now,
  );

  if (expired.length === 0) {
    logger.info("[utr-expiry] No expired pending payments found");
    return;
  }

  logger.info(`[utr-expiry] Found ${expired.length} payment(s) to expire`);

  // ── 2. Process each expired payment ──────────────────────────────────────
  for (const payment of expired) {
    try {
      // Mark as expired
      await upiService.updateUpiPayments(
        { id: payment.id },
        { utr_status: "expired" },
      );

      logger.info(
        `[utr-expiry] Expired payment ${payment.id} (cart_id=${payment.cart_id}, ` +
        `expires_at=${payment.expires_at})`,
      );

      // Cancel the linked Medusa Order if one was created.
      // NOTE: cancelOrder is available at runtime on the ORDER module service but
      // is not declared in IOrderModuleService in Medusa v2 typings — cast to any
      // to match the same pattern used in /store/payment/upi/submit-utr/route.ts.
      if (payment.order_id) {
        try {
          const orderModule = container.resolve(Modules.ORDER) as any;
          await orderModule.cancelOrder(payment.order_id);
          logger.info(
            `[utr-expiry] Cancelled Medusa order ${payment.order_id} for payment ${payment.id}`,
          );
        } catch (cancelErr: any) {
          // Order cancel failure is non-fatal — the UpiPayment state is already
          // updated.  Log the error so ops can resolve manually.
          logger.error(
            `[utr-expiry] Failed to cancel order ${payment.order_id}: ${cancelErr.message}`,
          );
        }
      }
    } catch (err: any) {
      // Isolate per-record failures so one bad record does not block the rest
      logger.error(
        `[utr-expiry] Failed to expire payment ${payment.id}: ${err.message}`,
      );
    }
  }

  logger.info(`[utr-expiry] Completed. Expired ${expired.length} payment(s).`);
}

export const config = {
  name: "utr-expiry-job",
  /** Every 2 minutes. */
  schedule: "*/2 * * * *",
};
