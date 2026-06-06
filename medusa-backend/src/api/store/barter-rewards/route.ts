import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/barter-rewards - Browse available rewards
 * POST /store/barter-rewards - Add a new reward (admin/partner)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rewardsService = req.scope.resolve("barterRewardsModuleService") as any
  const { category, max_cost, is_featured, delivery_type, limit, offset } = req.query as any

  try {
    const rewards = await rewardsService.browseRewards(
      {
        category,
        max_cost: max_cost ? Number(max_cost) : undefined,
        is_featured: is_featured === "true" ? true : undefined,
        delivery_type,
      },
      Number(limit) || 20,
      Number(offset) || 0
    )
    res.json({ rewards })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const rewardsService = req.scope.resolve("barterRewardsModuleService") as any

  try {
    const reward = await rewardsService.addReward(req.body)
    res.status(201).json({ reward })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
