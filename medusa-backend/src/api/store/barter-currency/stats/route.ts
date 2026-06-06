import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/barter-currency/stats - Get overall currency circulation stats
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const currencyService = req.scope.resolve("barterCurrencyModuleService") as any

  try {
    const stats = await currencyService.getCurrencyStats()
    res.json({ stats })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
