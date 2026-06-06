import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/barter-gamification?user_id=xxx - Get user's gamification profile
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const gamificationService = req.scope.resolve("barterGamificationModuleService") as any
  const { user_id } = req.query as any

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" })
  }

  try {
    const profile = await gamificationService.getUserProfile(user_id)
    res.json({ profile })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
