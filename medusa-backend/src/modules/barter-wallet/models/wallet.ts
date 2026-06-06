import { model } from "@medusajs/framework/utils"

/**
 * Wallet - Each teen/user has one wallet holding their barter credits.
 * Credits are earned by completing tasks and spent on rewards.
 */
export const Wallet = model.define("barter_wallet", {
  id: model.id().primaryKey(),
  user_id: model.text(),              // links to customer/user
  balance: model.number().default(0), // current spendable credits
  lifetime_earned: model.number().default(0),
  lifetime_spent: model.number().default(0),
  frozen_balance: model.number().default(0), // held in escrow for active tasks
  currency_code: model.text().default("SDC"), // SDC = Sadahaq Digital Currency
  is_active: model.boolean().default(true),
  last_transaction_at: model.dateTime().nullable(),
})
