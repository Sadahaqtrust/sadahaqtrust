import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /store/barter-wallet/credit - Credit BRT to a user's wallet
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const walletService = req.scope.resolve("barterWalletModuleService") as any
  const { user_id, amount, reference_type, reference_id, description } = req.body as any

  if (!user_id || !amount || !reference_type) {
    return res.status(400).json({ error: "user_id, amount, and reference_type are required" })
  }

  try {
    const result = await walletService.creditWallet({
      user_id,
      amount: Number(amount),
      reference_type,
      reference_id,
      description,
    })
    res.json(result)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
