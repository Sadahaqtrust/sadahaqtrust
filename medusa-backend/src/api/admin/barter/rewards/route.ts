import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /admin/barter/rewards - List all rewards (admin view)
 * POST /admin/barter/rewards - Create a new reward
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rewardsService = req.scope.resolve("barterRewardsModuleService") as any
  const { category, limit, offset } = req.query as any

  try {
    const filter: any = {}
    if (category) filter.category = [category]

    const rewards = await rewardsService.listRewards(filter, {
      order: { created_at: "DESC" },
      take: Number(limit) || 50,
      skip: Number(offset) || 0,
    })
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
