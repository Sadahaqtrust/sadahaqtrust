import { model } from "@medusajs/framework/utils";

export const UpiPayment = model.define("upi_payment", {
  id: model.id().primaryKey(),
  cart_id: model.text(),
  order_id: model.text().nullable(),
  merchant_upi_id: model.text(),
  merchant_upi_name: model.text(),
  merchant_amount: model.number(),
  merchant_utr: model.text().nullable(),
  merchant_payment_status: model.enum(["pending", "captured"]).default("pending"),
  rider_upi_id: model.text().nullable(),
  rider_upi_name: model.text().nullable(),
  rider_amount: model.number().nullable(),
  rider_utr: model.text().nullable(),
  rider_payment_status: model.enum(["pending", "captured", "not_applicable"]).default("not_applicable"),
  requires_delivery: model.boolean().default(false),

  // Deferred-commit state machine fields (Requirements 7.1, 7.3, 7.5, 7.6)
  utr_status: model.enum(["pending", "utr_submitted", "disbursed", "expired"]).default("pending"),
  utr_submitted_at: model.dateTime().nullable(),
  disbursed_at: model.dateTime().nullable(),
  expires_at: model.dateTime().nullable(),       // set to now + 15 min on order creation
  disbursement_failure: model.boolean().default(false),
  attempt_count: model.number().default(0),      // formalised from existing logic
  last_attempt_at: model.dateTime().nullable(),  // companion field used in rate-limit logic
});
