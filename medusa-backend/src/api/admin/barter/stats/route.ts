import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /admin/barter/stats - Get overall barter system stats
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const taskService = req.scope.resolve("barterTasksModuleService") as any
  const rewardsService = req.scope.resolve("barterRewardsModuleService") as any
  const walletService = req.scope.resolve("barterWalletModuleService") as any
  const currencyService = req.scope.resolve("barterCurrencyModuleService") as any

  try {
    const allTasks = await taskService.listTasks({})
    const openTasks = await taskService.listTasks({ status: ["open"] })
    const completedTasks = await taskService.listTasks({ status: ["completed"] })
    const allRewards = await rewardsService.listRewards({})
    const allWallets = await walletService.listWallets({})
    const currencyStats = await currencyService.getCurrencyStats()

    const totalEarned = allWallets.reduce((sum: number, w: any) => sum + (Number(w.lifetime_earned) || 0), 0)
    const totalSpent = allWallets.reduce((sum: number, w: any) => sum + (Number(w.lifetime_spent) || 0), 0)

    res.json({
      stats: {
        tasks: { total: allTasks.length, open: openTasks.length, completed: completedTasks.length },
        rewards: { total: allRewards.length },
        wallets: { total: allWallets.length, total_earned: totalEarned, total_spent: totalSpent },
        currency: currencyStats,
      }
    })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
