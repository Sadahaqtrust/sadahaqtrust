import { model } from "@medusajs/framework/utils"

/**
 * Badge - Achievements teens can earn through platform activity.
 */
export const Badge = model.define("barter_badge", {
  id: model.id().primaryKey(),
  name: model.text(),
  description: model.text().nullable(),
  icon_url: model.text().nullable(),
  category: model.text(),              // "task" | "social" | "streak" | "skill" | "community" | "milestone"
  tier: model.text().default("bronze"), // "bronze" | "silver" | "gold" | "platinum"
  criteria_type: model.text(),         // "task_count" | "credits_earned" | "streak_days" | "category_tasks" | "rating_avg" | "referrals"
  criteria_value: model.number(),      // e.g., 10 tasks, 500 credits, 7 day streak
  criteria_metadata: model.text().nullable(), // JSON for complex criteria
  bonus_credits: model.number().default(0),   // bonus BRT awarded when badge is earned
  is_active: model.boolean().default(true),
  sort_order: model.number().default(0),
})
