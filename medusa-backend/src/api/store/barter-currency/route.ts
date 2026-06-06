import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/barter-currency?user_id=xxx - Get currency account balance
 * POST /store/barter-currency - Create currency account
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const currencyService = req.scope.resolve("barterCurrencyModuleService") as any
  const { user_id } = req.query as any

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" })
  }

  try {
    const balance = await currencyService.getAccountBalance(user_id)
    res.json({ account: balance })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const currencyService = req.scope.resolve("barterCurrencyModuleService") as any
  const { user_id, account_type } = req.body as any

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" })
  }

  try {
    const account = await currencyService.getOrCreateAccount(user_id, account_type)
    res.status(201).json({ account })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
