import { Module } from "@medusajs/framework/utils"
import BarterGamificationModuleService from "./services/barter-gamification-module-service"

export const BARTER_GAMIFICATION_MODULE = "barterGamificationModuleService"

export default Module(BARTER_GAMIFICATION_MODULE, {
  service: BarterGamificationModuleService,
})

export { Badge } from "./models/badge"
export { UserBadge } from "./models/user-badge"
export { UserLevel } from "./models/user-level"
export { LeaderboardEntry } from "./models/leaderboard-entry"
export { default as BarterGamificationModuleService } from "./services/barter-gamification-module-service"
