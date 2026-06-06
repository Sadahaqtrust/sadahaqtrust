import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /admin/barter/tasks - List all tasks (admin view)
 * POST /admin/barter/tasks - Create a new task
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const taskService = req.scope.resolve("barterTasksModuleService") as any
  const { category, status, limit, offset } = req.query as any

  try {
    const filter: any = {}
    if (category) filter.category = [category]
    if (status) filter.status = [status]

    const tasks = await taskService.listTasks(filter, {
      order: { created_at: "DESC" },
      take: Number(limit) || 50,
      skip: Number(offset) || 0,
    })
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
