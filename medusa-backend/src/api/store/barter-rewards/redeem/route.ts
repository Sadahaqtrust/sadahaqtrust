import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /store/barter-rewards/redeem - Redeem a reward using BRT credits
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const rewardsService = req.scope.resolve("barterRewardsModuleService") as any
  const walletService = req.scope.resolve("barterWalletModuleService") as any
  const { reward_id, user_id, delivery_address } = req.body as any

  if (!reward_id || !user_id) {
    return res.status(400).json({ error: "reward_id and user_id are required" })
  }

  try {
    // Get reward to check cost
    const reward = await rewardsService.getRewardDetail(reward_id)

    // Debit wallet first
    await walletService.debitWallet({
      user_id,
      amount: reward.credit_cost,
      reference_type: "reward",
      reference_id: reward_id,
      description: `Redeemed: ${reward.title}`,
    })

    // Process redemption
    const result = await rewardsService.redeemReward({ reward_id, user_id, delivery_address })

    res.json({
      redemption: result.redemption,
      credits_spent: result.credit_cost,
      voucher_code: result.voucher_code,
    })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
