import { model } from "@medusajs/framework/utils"

/**
 * Transaction - Double-entry ledger for all credit movements.
 * Every earn/spend/escrow/release is recorded here.
 */
export const Transaction = model.define("barter_transaction", {
  id: model.id().primaryKey(),
  wallet_id: model.text(),
  type: model.text(),                // "credit" | "debit" | "escrow_hold" | "escrow_release" | "escrow_forfeit"
  amount: model.number(),
  balance_after: model.number(),
  reference_type: model.text().nullable(), // "task" | "reward" | "bonus" | "refund" | "transfer"
  reference_id: model.text().nullable(),   // ID of the task/reward/etc
  description: model.text().nullable(),
  metadata: model.text().nullable(),       // JSON string for extra data
})
