import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/barter-tasks/my?user_id=xxx&type=applications|posted&status=xxx
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const taskService = req.scope.resolve("barterTasksModuleService") as any
  const { user_id, type, status } = req.query as any

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" })
  }

  try {
    if (type === "posted") {
      const tasks = await taskService.getMyPostedTasks(user_id)
      res.json({ tasks })
    } else {
      const applications = await taskService.getMyApplications(user_id, status)
      res.json({ applications })
    }
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
