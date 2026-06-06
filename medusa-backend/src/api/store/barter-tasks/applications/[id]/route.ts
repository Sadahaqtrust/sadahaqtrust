import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /store/barter-tasks/applications/:id - Update application status
 * Body: { action: "accept" | "start" | "submit" | "approve" | "reject", proof_url?, proof_notes?, rating?, feedback?, reason? }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const taskService = req.scope.resolve("barterTasksModuleService") as any
  const walletService = req.scope.resolve("barterWalletModuleService") as any
  const gamificationService = req.scope.resolve("barterGamificationModuleService") as any
  const { id } = req.params
  const { action, proof_url, proof_notes, rating, feedback, reason } = req.body as any

  try {
    let result: any

    switch (action) {
      case "accept":
        result = await taskService.acceptApplication(id)
        break

      case "start":
        result = await taskService.startTask(id)
        break

      case "submit":
        result = await taskService.submitTask(id, proof_url, proof_notes)
        break

      case "approve":
        result = await taskService.approveTask(id, rating, feedback)
        // Credit the teen's wallet
        if (result.credits_earned && result.applicant_id) {
          await walletService.creditWallet({
            user_id: result.applicant_id,
            amount: result.credits_earned,
            reference_type: "task",
            reference_id: result.task_id,
            description: `Task completed: earned ${result.credits_earned} BRT`,
          })
          // Update gamification
          await gamificationService.recordTaskCompletion(result.applicant_id, rating)
          await gamificationService.updateStreak(result.applicant_id)
        }
        break

      case "reject":
        if (!reason) return res.status(400).json({ error: "reason is required for rejection" })
        result = await taskService.rejectTask(id, reason)
        break

      default:
        return res.status(400).json({ error: "Invalid action. Use: accept, start, submit, approve, reject" })
    }

    res.json(result)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
