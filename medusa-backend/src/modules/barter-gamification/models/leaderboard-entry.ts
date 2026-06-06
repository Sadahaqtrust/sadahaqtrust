import { model } from "@medusajs/framework/utils"

/**
 * LeaderboardEntry - Weekly/monthly leaderboard snapshots.
 */
export const LeaderboardEntry = model.define("barter_leaderboard_entry", {
  id: model.id().primaryKey(),
  user_id: model.text(),
  period_type: model.text(),           // "weekly" | "monthly" | "all_time"
  period_key: model.text(),            // "2024-W23" or "2024-06" or "all"
  xp_earned: model.number().default(0),
  tasks_completed: model.number().default(0),
  credits_earned: model.number().default(0),
  rank: model.number().default(0),
  locality: model.text().nullable(),   // for local leaderboards
})
