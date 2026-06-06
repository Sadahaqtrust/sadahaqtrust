import { model } from "@medusajs/framework/utils"

/**
 * UserLevel - Tracks XP and level progression for each user.
 */
export const UserLevel = model.define("barter_user_level", {
  id: model.id().primaryKey(),
  user_id: model.text(),
  xp_total: model.number().default(0),
  level: model.number().default(1),
  level_name: model.text().default("Newcomer"), // "Newcomer" | "Hustler" | "Pro" | "Champion" | "Legend"
  tasks_completed: model.number().default(0),
  current_streak_days: model.number().default(0),
  longest_streak_days: model.number().default(0),
  last_active_date: model.text().nullable(),    // YYYY-MM-DD for streak tracking
  reputation_score: model.number().default(0),  // weighted from ratings received
  referral_count: model.number().default(0),
})
