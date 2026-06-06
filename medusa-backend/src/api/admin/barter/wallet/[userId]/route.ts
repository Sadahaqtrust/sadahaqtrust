import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /admin/barter/wallet/:userId - Get user wallet details
 * POST /admin/barter/wallet/:userId - Credit/debit user wallet
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const walletService = req.scope.resolve("barterWalletModuleService") as any
  const gamificationService = req.scope.resolve("barterGamificationModuleService") as any
  const { userId } = req.params

  try {
    const balance = await walletService.getBalance(userId)
    const profile = await gamificationService.getUserProfile(userId)
    const transactions = await walletService.getTransactionHistory(userId, 10)

    res.json({ wallet: balance, profile, recent_transactions: transactions })
  } catch (e: any) {
    res.status(404).json({ error: e.message })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const walletService = req.scope.resolve("barterWalletModuleService") as any
  const { userId } = req.params
  const { action, amount, reason } = req.body as any

  try {
    if (action === "credit") {
      const result = await walletService.creditWallet({
        user_id: userId,
        amount: Number(amount),
        reference_type: "admin_bonus",
        description: reason || "Admin bonus",
      })
      res.json(result)
    } else if (action === "debit") {
      const result = await walletService.debitWallet({
        user_id: userId,
        amount: Number(amount),
        reference_type: "admin_debit",
        description: reason || "Admin debit",
      })
      res.json(result)
    } else {
      res.status(400).json({ error: "action must be 'credit' or 'debit'" })
    }
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
