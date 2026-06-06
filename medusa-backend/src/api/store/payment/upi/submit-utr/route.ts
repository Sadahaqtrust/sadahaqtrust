/**
 * POST /store/payment/upi/submit-utr
 *
 * Phase 1 of the UPI deferred-commit state machine.
 *
 * Validates the UTR submitted by the Customer and transitions the UpiPayment
 * from `pending` → `utr_submitted`.  Cart completion is intentionally NOT
 * performed here; it is triggered by the utr-submitted subscriber (task 6.3)
 * once this transition occurs.
 *
 * State transitions
 * ─────────────────
 * Valid UTR (format passes /^[A-Za-z0-9]{12,23}$/):
 *   utr_status  : "pending"       → "utr_submitted"
 *   utr_submitted_at             : now
 *   expires_at                   : created_at + 15 min
 *   Emits event  : "upi.utr_submitted"  (consumed by task-6.3 subscriber)
 *
 * Invalid UTR, attempt_count < 3  (after increment):
 *   utr_status  : remains "pending"
 *   Returns 422 with resubmission prompt
 *
 * Invalid UTR, attempt_count >= 3 (after increment):
 *   utr_status  : "pending" → "expired"
 *   Medusa Order cancelled if order_id present
 *   Returns 422 with support-contact message
 *
 * Requirements: 7.3, 7.6, 7.7, 7.9
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import { UPI_MODULE } from "../../../../../modules/upi";
import { resolveCustomerFromToken } from "../../../../../lib/auth";
import { getClientIP, auditUPI } from "../../../../../modules/upi/security";

/** Spec-mandated UTR regex: 12–23 alphanumeric characters (Requirements 7.3, 7.7). */
const UTR_REGEX = /^[A-Za-z0-9]{12,23}$/;

/** Maximum UTR submission attempts before the payment is expired (Requirement 7.9). */
const MAX_ATTEMPTS = 3;

/** Minutes after order creation before an unconfirmed UTR expires (Requirement 7.6). */
const EXPIRES_AFTER_MINUTES = 15;

/**
 * Cancels a Medusa Order via the Order module.
 * Errors are logged but do not propagate — the UpiPayment state has already
 * been updated and must not be rolled back because of a downstream cancel failure.
 */
async function cancelMedusaOrder(container: any, orderId: string, logger: any): Promise<void> {
  try {
    const orderModule = container.resolve(Modules.ORDER);
    await orderModule.cancelOrder(orderId);
    logger.info(`[submit-utr] Cancelled Medusa order ${orderId}`);
  } catch (err: any) {
    logger.error(`[submit-utr] Failed to cancel order ${orderId}: ${err.message}`);
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ip = getClientIP(req);
  const logger = (req as any).scope?.resolve?.("logger") || console;

  // ── Authentication ─────────────────────────────────────────────────────────
  // This is a customer-facing endpoint — any authenticated customer may submit
  // a UTR for their own cart.  No admin-only gate is applied here.
  const customerId = await resolveCustomerFromToken(req);
  if (!customerId) {
    auditUPI("UTR_SUBMIT_UNAUTHENTICATED", { ip }, ip);
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ── Input parsing ──────────────────────────────────────────────────────────
  const { cart_id, utr } = req.body as { cart_id?: string; utr?: string };

  if (!cart_id) return res.status(400).json({ error: "cart_id is required", field: "cart_id" });
  if (!utr)     return res.status(400).json({ error: "utr is required",     field: "utr"     });

  // ── Look up UpiPayment record ───────────────────────────────────────────────
  const upiService = req.scope.resolve(UPI_MODULE);
  const [upiPayment] = await upiService.listUpiPayments({ cart_id });

  if (!upiPayment) {
    return res.status(404).json({ error: "No UPI payment record found for this cart" });
  }

  // Guard: already beyond pending — idempotent shortcut for duplicate submits
  if (upiPayment.utr_status === "utr_submitted") {
    return res.json({ success: true, status: "utr_submitted", message: "UTR already recorded" });
  }

  if (upiPayment.utr_status === "expired") {
    return res.status(400).json({ error: "This payment has expired. Please contact support.", code: "UTR_EXPIRED" });
  }

  if (upiPayment.utr_status === "disbursed") {
    return res.status(400).json({ error: "Payment already disbursed.", code: "ALREADY_DISBURSED" });
  }

  // ── Increment attempt counter ──────────────────────────────────────────────
  // The counter is incremented unconditionally before validating the UTR so
  // that every submission (valid or not) consumes an attempt slot.
  const newAttemptCount = (upiPayment.attempt_count || 0) + 1;
  await upiService.updateUpiPayments(
    { id: upiPayment.id },
    { attempt_count: newAttemptCount, last_attempt_at: new Date() },
  );

  // ── UTR format validation ──────────────────────────────────────────────────
  const utrTrimmed = utr.trim();
  const isValidFormat = UTR_REGEX.test(utrTrimmed);

  if (!isValidFormat) {
    auditUPI("UTR_INVALID_FORMAT", { cart_id, utr: utrTrimmed, attempt: newAttemptCount }, ip);

    if (newAttemptCount >= MAX_ATTEMPTS) {
      // ── 3rd (or beyond) failed attempt — expire the payment ───────────────
      await upiService.updateUpiPayments(
        { id: upiPayment.id },
        { utr_status: "expired" },
      );

      // Cancel the Medusa Order if one was already linked
      if (upiPayment.order_id) {
        await cancelMedusaOrder(req.scope, upiPayment.order_id, logger);
      }

      auditUPI("UTR_EXPIRED_MAX_ATTEMPTS", { cart_id, attempts: newAttemptCount }, ip);

      return res.status(422).json({
        error: "Maximum submission attempts reached. Your payment has been cancelled. Please contact support to resolve this.",
        code: "UTR_MAX_ATTEMPTS_EXCEEDED",
        status: "expired",
      });
    }

    // ── Fewer than MAX_ATTEMPTS — resubmission still allowed ─────────────
    const remaining = MAX_ATTEMPTS - newAttemptCount;
    return res.status(422).json({
      error: "Invalid UTR format. UTR must be 12–23 alphanumeric characters.",
      code: "UTR_INVALID_FORMAT",
      field: "utr",
      attempts_remaining: remaining,
      message: `Please re-enter your UTR. You have ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    });
  }

  // ── Valid UTR — Phase 1 commit ─────────────────────────────────────────────
  //
  // Calculate expires_at = created_at + 15 min.
  // If created_at is somehow null (shouldn't happen), fall back to now + 15 min.
  const createdAt = upiPayment.created_at ? new Date(upiPayment.created_at) : new Date();
  const expiresAt = new Date(createdAt.getTime() + EXPIRES_AFTER_MINUTES * 60 * 1000);
  const utrSubmittedAt = new Date();

  await upiService.updateUpiPayments(
    { id: upiPayment.id },
    {
      utr_status: "utr_submitted",
      utr_submitted_at: utrSubmittedAt,
      expires_at: expiresAt,
      // Store the UTR so the subscriber / admin can reference it
      merchant_utr: utrTrimmed.toUpperCase(),
    },
  );

  auditUPI("UTR_SUBMITTED", { cart_id, utr: utrTrimmed.toUpperCase(), attempt: newAttemptCount }, ip);

  // ── Emit domain event for subscriber (task 6.3) ───────────────────────────
  // The subscriber listens for "upi.utr_submitted" and completes the cart +
  // creates the DeliveryOrder with lifecycle_status = "broadcast".
  try {
    const eventBus = req.scope.resolve("eventBusModuleService") as any;
    await eventBus.emit("upi.utr_submitted", {
      upi_payment_id: upiPayment.id,
      cart_id,
      customer_id: customerId,
    });
  } catch (err: any) {
    // Event emission failure must not break the HTTP response — the subscriber
    // can also be driven by a polling job as a fallback.
    logger.warn(`[submit-utr] Event emission failed (will be retried by job): ${err.message}`);
  }

  return res.json({
    success: true,
    status: "utr_submitted",
    expires_at: expiresAt.toISOString(),
    message: "UTR received. Your order is being confirmed.",
  });
}
