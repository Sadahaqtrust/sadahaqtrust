import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/barter-wallet - Get wallet balance for authenticated user
 * POST /store/barter-wallet - Create/get wallet for authenticated user
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const walletService = req.scope.resolve("barterWalletModuleService") as any
  const userId = (req as any).query.user_id

  if (!userId) {
    return res.status(400).json({ error: "user_id is required" })
  }

  try {
    const balance = await walletService.getBalance(userId)
    res.json({ wallet: balance })
  } catch (e: any) {
    res.status(404).json({ error: e.message })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const walletService = req.scope.resolve("barterWalletModuleService") as any
  const { user_id } = req.body as any

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" })
  }

  try {
    const wallet = await walletService.getOrCreateWallet(user_id)
    res.status(201).json({ wallet })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
