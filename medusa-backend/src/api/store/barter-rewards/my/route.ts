import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/barter-rewards/my?user_id=xxx - Get user's redemption history
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rewardsService = req.scope.resolve("barterRewardsModuleService") as any
  const { user_id } = req.query as any

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" })
  }

  try {
    const redemptions = await rewardsService.getMyRedemptions(user_id)
    res.json({ redemptions })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
