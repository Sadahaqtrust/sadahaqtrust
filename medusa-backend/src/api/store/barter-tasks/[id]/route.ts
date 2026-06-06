import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/barter-tasks/:id - Get task detail with applications
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const taskService = req.scope.resolve("barterTasksModuleService") as any
  const { id } = req.params

  try {
    const task = await taskService.getTaskDetail(id)
    res.json({ task })
  } catch (e: any) {
    res.status(404).json({ error: e.message })
  }
}
