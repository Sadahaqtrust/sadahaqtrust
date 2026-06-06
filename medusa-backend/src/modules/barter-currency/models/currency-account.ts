import { model } from "@medusajs/framework/utils"

/**
 * CurrencyAccount - Digital currency account for the platform's own currency.
 * This is the Phase 3 evolution where BRT credits become a real digital currency.
 */
export const CurrencyAccount = model.define("barter_currency_account", {
  id: model.id().primaryKey(),
  user_id: model.text(),
  account_type: model.text().default("individual"), // "individual" | "partner" | "platform" | "community_pool"
  balance: model.number().default(0),
  credit_limit: model.number().default(0),     // how much they can go negative (mutual credit)
  total_issued: model.number().default(0),     // total currency issued to this account
  total_redeemed: model.number().default(0),   // total currency redeemed/spent
  trust_score: model.number().default(50),     // 0-100, affects credit limit
  is_active: model.boolean().default(true),
  is_frozen: model.boolean().default(false),
  last_activity_at: model.dateTime().nullable(),
})
