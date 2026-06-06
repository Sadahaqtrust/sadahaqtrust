import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/barter-gamification/leaderboard?period_type=weekly&period_key=2024-W23&locality=xxx&limit=20
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const gamificationService = req.scope.resolve("barterGamificationModuleService") as any
  const { period_type, period_key, locality, limit } = req.query as any

  if (!period_type || !period_key) {
    return res.status(400).json({ error: "period_type and period_key are required" })
  }

  try {
    const leaderboard = await gamificationService.getLeaderboard(
      period_type,
      period_key,
      locality,
      Number(limit) || 20
    )
    res.json({ leaderboard })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
