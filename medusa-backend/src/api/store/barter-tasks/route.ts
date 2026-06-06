import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/barter-tasks - Browse available tasks
 * POST /store/barter-tasks - Post a new task
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const taskService = req.scope.resolve("barterTasksModuleService") as any
  const { category, difficulty, location_type, locality, status, limit, offset } = req.query as any

  try {
    const tasks = await taskService.browseTasks(
      { category, difficulty, location_type, locality, status },
      Number(limit) || 20,
      Number(offset) || 0
    )
    res.json({ tasks })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const taskService = req.scope.resolve("barterTasksModuleService") as any

  try {
    const task = await taskService.postTask(req.body)
    res.status(201).json({ task })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
