import { model } from "@medusajs/framework/utils"

/**
 * CurrencyTransfer - Peer-to-peer transfers in the digital currency.
 */
export const CurrencyTransfer = model.define("barter_currency_transfer", {
  id: model.id().primaryKey(),
  from_account_id: model.text(),
  to_account_id: model.text(),
  amount: model.number(),
  transfer_type: model.text(),         // "payment" | "gift" | "reward" | "credit_settlement"
  reference_type: model.text().nullable(), // "task" | "reward" | "p2p" | "partner"
  reference_id: model.text().nullable(),
  status: model.text().default("completed"), // "pending" | "completed" | "failed" | "reversed"
  description: model.text().nullable(),
  from_balance_after: model.number().default(0),
  to_balance_after: model.number().default(0),
})
