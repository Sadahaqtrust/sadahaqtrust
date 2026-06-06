import { model } from "@medusajs/framework/utils"

/**
 * RewardRedemption - Record of a teen spending credits on a reward.
 */
export const RewardRedemption = model.define("barter_reward_redemption", {
  id: model.id().primaryKey(),
  reward_id: model.text(),
  user_id: model.text(),
  credits_spent: model.number(),
  status: model.text().default("pending"), // "pending" | "processing" | "fulfilled" | "failed" | "refunded"
  voucher_code: model.text().nullable(),   // assigned code for digital rewards
  delivery_address: model.text().nullable(),
  fulfilled_at: model.dateTime().nullable(),
  notes: model.text().nullable(),
})
