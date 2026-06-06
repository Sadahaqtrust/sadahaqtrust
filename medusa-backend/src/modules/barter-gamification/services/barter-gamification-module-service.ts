import { MedusaService } from "@medusajs/framework/utils"
import { Badge } from "../models/badge"
import { UserBadge } from "../models/user-badge"
import { UserLevel } from "../models/user-level"
import { LeaderboardEntry } from "../models/leaderboard-entry"

// XP thresholds for each level
const LEVEL_THRESHOLDS = [
  { level: 1, name: "Newcomer", xp: 0 },
  { level: 2, name: "Starter", xp: 100 },
  { level: 3, name: "Hustler", xp: 300 },
  { level: 4, name: "Achiever", xp: 700 },
  { level: 5, name: "Pro", xp: 1500 },
  { level: 6, name: "Expert", xp: 3000 },
  { level: 7, name: "Champion", xp: 6000 },
  { level: 8, name: "Master", xp: 10000 },
  { level: 9, name: "Legend", xp: 20000 },
  { level: 10, name: "Icon", xp: 50000 },
]

// XP rewards for different actions
const XP_REWARDS = {
  task_completed: 25,
  task_rated_5_stars: 10,
  badge_earned: 15,
  streak_day: 5,
  referral: 50,
  first_task: 50,
}

class BarterGamificationModuleService extends MedusaService({
  Badge,
  UserBadge,
  UserLevel,
  LeaderboardEntry,
}) {

  // ── User Level Management ─────────────────────────────────────────────────

  async getOrCreateUserLevel(userId: string) {
    const existing = await this.listUserLevels({ user_id: [userId] })
    if (existing.length) return existing[0]

    const [level] = await this.createUserLevels([{
      user_id: userId,
      xp_total: 0,
      level: 1,
      level_name: "Newcomer",
      tasks_completed: 0,
      current_streak_days: 0,
      longest_streak_days: 0,
      reputation_score: 0,
      referral_count: 0,
    }])
    return level
  }

  async getUserProfile(userId: string) {
    const level = await this.getOrCreateUserLevel(userId)
    const badges = await this.listUserBadges({ user_id: [userId] })
    const nextLevel = LEVEL_THRESHOLDS.find(l => l.xp > level.xp_total)

    return {
      ...level,
      badges,
      next_level: nextLevel || null,
      xp_to_next_level: nextLevel ? nextLevel.xp - level.xp_total : 0,
      progress_percent: nextLevel
        ? Math.round(((level.xp_total - (LEVEL_THRESHOLDS[level.level - 1]?.xp || 0)) /
          (nextLevel.xp - (LEVEL_THRESHOLDS[level.level - 1]?.xp || 0))) * 100)
        : 100,
    }
  }

  // ── XP & Level Progression ────────────────────────────────────────────────

  async addXP(userId: string, action: keyof typeof XP_REWARDS, multiplier = 1) {
    const xpAmount = (XP_REWARDS[action] || 0) * multiplier
    if (xpAmount === 0) return null

    const userLevel = await this.getOrCreateUserLevel(userId)
    const newXP = userLevel.xp_total + xpAmount

    // Calculate new level
    let newLevel = userLevel.level
    let newLevelName = userLevel.level_name
    for (const threshold of LEVEL_THRESHOLDS) {
      if (newXP >= threshold.xp) {
        newLevel = threshold.level
        newLevelName = threshold.name
      }
    }

    const leveledUp = newLevel > userLevel.level

    await this.updateUserLevels([{
      id: userLevel.id,
      xp_total: newXP,
      level: newLevel,
      level_name: newLevelName,
    }])

    return { xp_added: xpAmount, new_xp_total: newXP, level: newLevel, level_name: newLevelName, leveled_up: leveledUp }
  }

  async recordTaskCompletion(userId: string, rating?: number) {
    const userLevel = await this.getOrCreateUserLevel(userId)

    // Update task count
    const newTaskCount = userLevel.tasks_completed + 1
    await this.updateUserLevels([{
      id: userLevel.id,
      tasks_completed: newTaskCount,
    }])

    // Add XP
    const xpResult = await this.addXP(userId, "task_completed")

    // Bonus XP for 5-star rating
    if (rating === 5) {
      await this.addXP(userId, "task_rated_5_stars")
    }

    // First task bonus
    if (newTaskCount === 1) {
      await this.addXP(userId, "first_task")
    }

    // Check and award badges
    const newBadges = await this.checkAndAwardBadges(userId)

    return { xp: xpResult, new_badges: newBadges, tasks_completed: newTaskCount }
  }

  // ── Streak Tracking ───────────────────────────────────────────────────────

  async updateStreak(userId: string) {
    const userLevel = await this.getOrCreateUserLevel(userId)
    const today = new Date().toISOString().split("T")[0]

    if (userLevel.last_active_date === today) {
      return { streak: userLevel.current_streak_days, already_counted: true }
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
    let newStreak: number

    if (userLevel.last_active_date === yesterday) {
      newStreak = userLevel.current_streak_days + 1
    } else {
      newStreak = 1 // streak broken, restart
    }

    const longestStreak = Math.max(newStreak, userLevel.longest_streak_days)

    await this.updateUserLevels([{
      id: userLevel.id,
      current_streak_days: newStreak,
      longest_streak_days: longestStreak,
      last_active_date: today,
    }])

    // XP for streak
    await this.addXP(userId, "streak_day")

    return { streak: newStreak, longest: longestStreak }
  }

  // ── Badge System ──────────────────────────────────────────────────────────

  async checkAndAwardBadges(userId: string): Promise<any[]> {
    const userLevel = await this.getOrCreateUserLevel(userId)
    const existingBadges = await this.listUserBadges({ user_id: [userId] })
    const existingBadgeIds = existingBadges.map((ub: any) => ub.badge_id)

    const allBadges = await this.listBadges({ is_active: [true] })
    const newBadges: any[] = []

    for (const badge of allBadges) {
      if (existingBadgeIds.includes(badge.id)) continue

      let earned = false

      switch (badge.criteria_type) {
        case "task_count":
          earned = userLevel.tasks_completed >= badge.criteria_value
          break
        case "credits_earned":
          // This would need wallet data - skip for now, handled by workflow
          break
        case "streak_days":
          earned = userLevel.current_streak_days >= badge.criteria_value
          break
        case "rating_avg":
          earned = userLevel.reputation_score >= badge.criteria_value
          break
        case "referrals":
          earned = userLevel.referral_count >= badge.criteria_value
          break
        case "level":
          earned = userLevel.level >= badge.criteria_value
          break
      }

      if (earned) {
        const [userBadge] = await this.createUserBadges([{
          user_id: userId,
          badge_id: badge.id,
          earned_at: new Date(),
          is_displayed: true,
        }])
        newBadges.push({ ...badge, user_badge: userBadge })
      }
    }

    return newBadges
  }

  async getAllBadges() {
    return this.listBadges({ is_active: [true] }, { order: { sort_order: "ASC" } })
  }

  async getUserBadges(userId: string) {
    return this.listUserBadges({ user_id: [userId] }, { order: { earned_at: "DESC" } })
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────

  async getLeaderboard(periodType: string, periodKey: string, locality?: string, limit = 20) {
    const filter: any = {
      period_type: [periodType],
      period_key: [periodKey],
    }
    if (locality) filter.locality = [locality]

    return this.listLeaderboardEntries(filter, {
      order: { rank: "ASC" },
      take: limit,
    })
  }

  async updateLeaderboard(periodType: string, periodKey: string) {
    // Get all user levels sorted by XP
    const allUsers = await this.listUserLevels({}, { order: { xp_total: "DESC" } })

    for (let i = 0; i < allUsers.length; i++) {
      const user = allUsers[i] as any
      const existing = await this.listLeaderboardEntries({
        user_id: [user.user_id],
        period_type: [periodType],
        period_key: [periodKey],
      })

      const data = {
        user_id: user.user_id,
        period_type: periodType,
        period_key: periodKey,
        xp_earned: user.xp_total,
        tasks_completed: user.tasks_completed,
        rank: i + 1,
      }

      if (existing.length) {
        await this.updateLeaderboardEntries([{ id: existing[0].id, ...data }])
      } else {
        await this.createLeaderboardEntries([data])
      }
    }

    return { updated: allUsers.length }
  }

  // ── Reputation ────────────────────────────────────────────────────────────

  async updateReputation(userId: string, newRating: number) {
    const userLevel = await this.getOrCreateUserLevel(userId)
    const totalRatings = userLevel.tasks_completed || 1
    // Weighted average
    const newReputation = Math.round(
      ((userLevel.reputation_score * (totalRatings - 1)) + (newRating * 20)) / totalRatings
    )

    await this.updateUserLevels([{
      id: userLevel.id,
      reputation_score: Math.min(100, Math.max(0, newReputation)),
    }])

    return { reputation_score: newReputation }
  }
}

export default BarterGamificationModuleService
