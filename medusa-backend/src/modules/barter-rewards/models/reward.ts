import { model } from "@medusajs/framework/utils"

/**
 * Reward - Items teens can spend their credits on.
 * Supplied by partners (brands, telecoms, streaming services).
 */
export const Reward = model.define("barter_reward", {
  id: model.id().primaryKey(),
  partner_id: model.text().nullable(),
  title: model.text(),
  description: model.text().nullable(),
  category: model.text(),              // "data_pack" | "streaming" | "gaming" | "food" | "education" | "fashion" | "experience"
  subcategory: model.text().nullable(),
  image_url: model.text().nullable(),
  credit_cost: model.number(),         // how many BRT credits to redeem
  retail_value: model.number().default(0), // INR value for display
  stock_total: model.number().default(0),
  stock_remaining: model.number().default(0),
  delivery_type: model.text().default("digital"), // "digital" | "physical" | "voucher"
  delivery_instructions: model.text().nullable(),
  voucher_code_pool: model.text().nullable(), // JSON array of codes for digital rewards
  is_featured: model.boolean().default(false),
  is_active: model.boolean().default(true),
  valid_from: model.dateTime().nullable(),
  valid_until: model.dateTime().nullable(),
  min_age: model.number().default(14),
  max_redemptions_per_user: model.number().default(0), // 0 = unlimited
  tags: model.text().nullable(),
})
