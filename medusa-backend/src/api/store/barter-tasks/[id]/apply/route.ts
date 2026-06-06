import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /store/barter-tasks/:id/apply - Apply for a task
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const taskService = req.scope.resolve("barterTasksModuleService") as any
  const { id } = req.params
  const { applicant_id } = req.body as any

  if (!applicant_id) {
    return res.status(400).json({ error: "applicant_id is required" })
  }

  try {
    const application = await taskService.applyForTask({ task_id: id, applicant_id })
    res.status(201).json({ application })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
