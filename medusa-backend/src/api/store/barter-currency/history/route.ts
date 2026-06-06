import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/barter-currency/history?user_id=xxx&limit=20&offset=0
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const currencyService = req.scope.resolve("barterCurrencyModuleService") as any
  const { user_id, limit, offset } = req.query as any

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" })
  }

  try {
    const transfers = await currencyService.getTransferHistory(
      user_id,
      Number(limit) || 20,
      Number(offset) || 0
    )
    res.json({ transfers })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
