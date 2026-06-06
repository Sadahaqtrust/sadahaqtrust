import { model } from "@medusajs/framework/utils"

/**
 * CreditLine - Mutual credit relationships between accounts.
 * Like WIR/Sardex: accounts can extend credit to each other.
 */
export const CreditLine = model.define("barter_credit_line", {
  id: model.id().primaryKey(),
  from_account_id: model.text(),       // who extends the credit
  to_account_id: model.text(),         // who receives the credit line
  credit_amount: model.number(),       // max credit extended
  utilized: model.number().default(0), // how much is currently used
  interest_rate: model.number().default(0), // always 0 for social platform
  status: model.text().default("active"), // "active" | "suspended" | "closed"
  expires_at: model.dateTime().nullable(),
  reason: model.text().nullable(),     // why credit was extended
})
