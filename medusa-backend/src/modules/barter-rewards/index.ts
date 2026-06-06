import { Module } from "@medusajs/framework/utils"
import BarterRewardsModuleService from "./services/barter-rewards-module-service"

export const BARTER_REWARDS_MODULE = "barterRewardsModuleService"

export default Module(BARTER_REWARDS_MODULE, {
  service: BarterRewardsModuleService,
})

export { Reward } from "./models/reward"
export { RewardRedemption } from "./models/reward-redemption"
export { RewardPartner } from "./models/reward-partner"
export { default as BarterRewardsModuleService } from "./services/barter-rewards-module-service"
