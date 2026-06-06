import { model } from "@medusajs/framework/utils"

/**
 * RewardPartner - Brands/companies that supply rewards (data packs, subscriptions, etc.)
 */
export const RewardPartner = model.define("barter_reward_partner", {
  id: model.id().primaryKey(),
  name: model.text(),
  logo_url: model.text().nullable(),
  category: model.text(),              // "telecom" | "streaming" | "gaming" | "food" | "education" | "fashion"
  contact_person: model.text().nullable(),
  contact_email: model.text().nullable(),
  contact_phone: model.text().nullable(),
  website: model.text().nullable(),
  is_active: model.boolean().default(true),
  total_rewards_supplied: model.number().default(0),
  total_redemptions: model.number().default(0),
})
