import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/barter-gamification/badges - Get all available badges
 * GET /store/barter-gamification/badges?user_id=xxx - Get user's earned badges
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const gamificationService = req.scope.resolve("barterGamificationModuleService") as any
  const { user_id } = req.query as any

  try {
    if (user_id) {
      const badges = await gamificationService.getUserBadges(user_id)
      res.json({ badges })
    } else {
      const badges = await gamificationService.getAllBadges()
      res.json({ badges })
    }
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
