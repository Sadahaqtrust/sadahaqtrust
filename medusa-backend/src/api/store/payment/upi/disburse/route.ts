/**
 * POST /store/payment/upi/disburse
 *
 * Admin-scoped endpoint that issues two outbound P2P UPI disbursements:
 *   • Seller VPA  ← (order subtotal minus delivery fee)
 *   • Rider VPA   ← delivery fee
 *
 * This endpoint is called internally by the rider-accepted subscriber
 * (src/subscribers/rider-accepted.ts).  VPA values are resolved server-side;
 * they are NEVER exposed to the storefront.
 *
 * Request body (DisburseRequest):
 *   order_id       string  — Medusa Order ID linked to the UpiPayment
 *   seller_vpa     string  — Seller's UPI Virtual Payment Address
 *   seller_amount  number  — Amount to transfer to Seller (INR paise)
 *   rider_vpa      string  — Rider's UPI Virtual Payment Address
 *   rider_amount   number  — Amount to transfer to Rider (INR paise)
 *
 * Success (200):
 *   { disbursed: true, disbursed_at: string }
 *
 * Partial/full failure (200, utr_status retained as "utr_submitted"):
 *   { disbursed: false, disbursement_failure: true, errors: string[] }
 *
 * Validation failure (400):
 *   { error: string, field?: string }
 *
 * Requirements: 7.4, 7.5, 7.10
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { UPI_MODULE } from "../../../../../modules/upi";
import { checkAdminAuth, auditUPI, getClientIP } from "../../../../../modules/upi/security";
import type { DisburseRequest } from "../../../../../types/platform";

/** Regex for a basic UPI VPA format: localpart@provider */
const VPA_REGEX = /^[a-zA-Z0-9._\-]+@[a-zA-Z0-9]+$/;

/**
 * Simulates or performs a single P2P UPI transfer.
 *
 * In production this would integrate with a payment gateway SDK (e.g. Razorpay,
 * PayU, or a direct NPCI integration).  For now it performs a structured
 * "dry-run" in test mode and a real call in production.
 *
 * Returns { success: boolean, reference?: string, error?: string }
 */
async function performUpiTransfer(params: {
  vpa: string;
  amount: number; // paise
  reference: string;
  narration: string;
  logger: any;
}): Promise<{ success: boolean; reference?: string; error?: string }> {
  const { vpa, amount, reference, narration, logger } = params;

  // ── Test / sandbox mode ────────────────────────────────────────────────────
  if (process.env.UPI_TEST_MODE === "true") {
    logger.info(`[disburse] TEST MODE — simulating transfer ${amount} paise to ${vpa} (ref=${reference})`);
    // Simulate a small failure rate in test mode so callers handle errors properly
    if (process.env.UPI_TEST_FAIL === "true") {
      return { success: false, error: "Simulated test failure" };
    }
    return { success: true, reference: `TEST_${reference}_${Date.now()}` };
  }

  // ── Production UPI gateway call ────────────────────────────────────────────
  // Replace this stub with your actual payment provider integration.
  const gatewayUrl = process.env.UPI_GATEWAY_URL;
  const gatewayKey = process.env.UPI_GATEWAY_KEY;

  if (!gatewayUrl || !gatewayKey) {
    logger.warn("[disburse] UPI_GATEWAY_URL / UPI_GATEWAY_KEY not configured — using test mode fallback");
    return { success: true, reference: `STUB_${reference}_${Date.now()}` };
  }

  try {
    const resp = await globalThis.fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gatewayKey}`,
      },
      body: JSON.stringify({
        beneficiary_vpa: vpa,
        amount_paise: amount,
        transaction_ref: reference,
        narration,
      }),
    });

    const body = await resp.json().catch(() => ({}));

    if (resp.ok && body.success) {
      return { success: true, reference: body.transaction_id ?? reference };
    }

    return {
      success: false,
      error: body.error ?? body.message ?? `Gateway returned ${resp.status}`,
    };
  } catch (err: any) {
    return { success: false, error: `Gateway request failed: ${err.message}` };
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ip = getClientIP(req);
  const logger = (req as any).scope?.resolve?.("logger") || console;

  // ── Admin-only gate ─────────────────────────────────────────────────────────
  const auth = await checkAdminAuth(req);
  if (!auth.allowed) {
    auditUPI("DISBURSE_DENIED", { reason: auth.reason, ip }, ip);
    return res.status(403).json({ error: auth.reason || "Forbidden" });
  }

  // ── Input parsing and validation ────────────────────────────────────────────
  const { order_id, seller_vpa, seller_amount, rider_vpa, rider_amount } =
    req.body as Partial<DisburseRequest>;

  if (!order_id) return res.status(400).json({ error: "order_id is required", field: "order_id" });
  if (!seller_vpa) return res.status(400).json({ error: "seller_vpa is required", field: "seller_vpa" });
  if (!rider_vpa) return res.status(400).json({ error: "rider_vpa is required", field: "rider_vpa" });
  if (seller_amount === undefined || seller_amount === null) {
    return res.status(400).json({ error: "seller_amount is required", field: "seller_amount" });
  }
  if (rider_amount === undefined || rider_amount === null) {
    return res.status(400).json({ error: "rider_amount is required", field: "rider_amount" });
  }

  if (!VPA_REGEX.test(seller_vpa)) {
    return res.status(400).json({ error: "Invalid seller_vpa format", field: "seller_vpa" });
  }
  if (!VPA_REGEX.test(rider_vpa)) {
    return res.status(400).json({ error: "Invalid rider_vpa format", field: "rider_vpa" });
  }
  if (typeof seller_amount !== "number" || seller_amount <= 0) {
    return res.status(400).json({ error: "seller_amount must be a positive number", field: "seller_amount" });
  }
  if (typeof rider_amount !== "number" || rider_amount <= 0) {
    return res.status(400).json({ error: "rider_amount must be a positive number", field: "rider_amount" });
  }

  // ── Look up the UpiPayment record ───────────────────────────────────────────
  const upiService = req.scope.resolve(UPI_MODULE);
  const payments = await upiService.listUpiPayments({ order_id });

  if (payments.length === 0) {
    return res.status(404).json({ error: "No UpiPayment record found for this order" });
  }

  const upiPayment = payments[0];

  // Guard: only disburse from utr_submitted state (Requirement 7.5)
  if (upiPayment.utr_status === "disbursed") {
    return res.json({
      disbursed: true,
      disbursed_at: upiPayment.disbursed_at,
      message: "Already disbursed",
    });
  }

  if (upiPayment.utr_status !== "utr_submitted") {
    return res.status(400).json({
      error: `Cannot disburse: UpiPayment.utr_status is '${upiPayment.utr_status}', expected 'utr_submitted'`,
      code: "INVALID_UTR_STATUS",
    });
  }

  auditUPI("DISBURSE_INITIATED", {
    order_id,
    seller_vpa,
    seller_amount,
    rider_vpa,
    rider_amount,
    admin: auth.email,
  }, ip);

  // ── Issue both UPI transfers ─────────────────────────────────────────────────
  const errors: string[] = [];

  // Transfer 1 — Seller
  const sellerResult = await performUpiTransfer({
    vpa: seller_vpa,
    amount: seller_amount,
    reference: `${order_id}_S`,
    narration: `Digital Rohtak order ${order_id} — seller payout`,
    logger,
  });

  if (!sellerResult.success) {
    errors.push(`Seller transfer failed: ${sellerResult.error}`);
  }

  // Transfer 2 — Rider
  const riderResult = await performUpiTransfer({
    vpa: rider_vpa,
    amount: rider_amount,
    reference: `${order_id}_R`,
    narration: `Digital Rohtak order ${order_id} — rider delivery fee`,
    logger,
  });

  if (!riderResult.success) {
    errors.push(`Rider transfer failed: ${riderResult.error}`);
  }

  // ── Update UpiPayment based on outcome ──────────────────────────────────────
  if (errors.length === 0) {
    // Both succeeded — transition to "disbursed" (Requirement 7.5)
    const disbursedAt = new Date();
    await upiService.updateUpiPayments(
      { id: upiPayment.id },
      {
        utr_status: "disbursed",
        disbursed_at: disbursedAt,
        disbursement_failure: false,
      }
    );

    auditUPI("DISBURSE_SUCCESS", { order_id, seller_ref: sellerResult.reference, rider_ref: riderResult.reference }, ip);

    logger.info(`[disburse] Both transfers succeeded for order ${order_id}`);

    return res.json({
      disbursed: true,
      disbursed_at: disbursedAt.toISOString(),
    });
  } else {
    // One or both failed — retain utr_submitted, set disbursement_failure (Requirement 7.10)
    await upiService.updateUpiPayments(
      { id: upiPayment.id },
      {
        utr_status: "utr_submitted",  // explicitly retain — do not change
        disbursement_failure: true,
      }
    );

    auditUPI("DISBURSE_FAILURE", { order_id, errors }, ip);

    logger.error(`[disburse] Disbursement failures for order ${order_id}: ${errors.join("; ")}`);

    return res.json({
      disbursed: false,
      disbursement_failure: true,
      errors,
    });
  }
}
