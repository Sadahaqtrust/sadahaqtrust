import { MedusaService } from "@medusajs/framework/utils"
import { Task } from "../models/task"
import { TaskApplication } from "../models/task-application"

class BarterTasksModuleService extends MedusaService({
  Task,
  TaskApplication,
}) {

  // ── Task Posting ──────────────────────────────────────────────────────────

  async postTask(input: {
    posted_by: string
    poster_type?: string
    title: string
    description?: string
    category: string
    subcategory?: string
    reward_credits: number
    estimated_minutes?: number
    difficulty?: string
    min_age?: number
    max_age?: number
    skills_required?: string
    location_type?: string
    locality?: string
    max_applicants?: number
    deadline?: Date
    instructions_url?: string
    verification_type?: string
    is_recurring?: boolean
    recurrence_rule?: string
    tags?: string
  }) {
    if (input.reward_credits <= 0) throw new Error("Reward credits must be positive")

    const [task] = await this.createTasks([{
      ...input,
      status: "open",
      current_applicants: 0,
      is_active: true,
    }])
    return task
  }

  // ── Task Discovery ────────────────────────────────────────────────────────

  async browseTasks(filters: {
    category?: string
    difficulty?: string
    location_type?: string
    locality?: string
    status?: string
    min_credits?: number
    max_credits?: number
  }, limit = 20, offset = 0) {
    const filter: any = { is_active: [true] }

    if (filters.status) filter.status = [filters.status]
    else filter.status = ["open"]

    if (filters.category) filter.category = [filters.category]
    if (filters.difficulty) filter.difficulty = [filters.difficulty]
    if (filters.location_type) filter.location_type = [filters.location_type]
    if (filters.locality) filter.locality = [filters.locality]

    return this.listTasks(filter, {
      order: { created_at: "DESC" },
      take: limit,
      skip: offset,
    })
  }

  async getTaskDetail(taskId: string) {
    const [task] = await this.listTasks({ id: [taskId] })
    if (!task) throw new Error("Task not found")

    const applications = await this.listTaskApplications(
      { task_id: [taskId] },
      { order: { created_at: "DESC" } }
    )

    return { ...task, applications }
  }

  // ── Task Application ──────────────────────────────────────────────────────

  async applyForTask(input: { task_id: string; applicant_id: string }) {
    const [task] = await this.listTasks({ id: [input.task_id] })
    if (!task) throw new Error("Task not found")
    if (task.status !== "open") throw new Error("Task is no longer open")
    if (task.current_applicants >= task.max_applicants) throw new Error("Task is full")

    // Check if already applied
    const existing = await this.listTaskApplications({
      task_id: [input.task_id],
      applicant_id: [input.applicant_id],
    })
    if (existing.length) throw new Error("Already applied for this task")

    const [application] = await this.createTaskApplications([{
      task_id: input.task_id,
      applicant_id: input.applicant_id,
      status: "applied",
      applied_at: new Date(),
    }])

    // Update applicant count
    await this.updateTasks([{
      id: input.task_id,
      current_applicants: task.current_applicants + 1,
    }])

    return application
  }

  async acceptApplication(applicationId: string) {
    const [app] = await this.listTaskApplications({ id: [applicationId] })
    if (!app) throw new Error("Application not found")
    if (app.status !== "applied") throw new Error("Application cannot be accepted in current state")

    await this.updateTaskApplications([{
      id: applicationId,
      status: "accepted",
      accepted_at: new Date(),
    }])

    // If max applicants reached, close the task
    const [task] = await this.listTasks({ id: [app.task_id] })
    if (task) {
      const accepted = await this.listTaskApplications({
        task_id: [app.task_id],
        status: ["accepted", "in_progress", "submitted"],
      })
      if (accepted.length >= task.max_applicants) {
        await this.updateTasks([{ id: app.task_id, status: "in_progress" }])
      }
    }

    return { id: applicationId, status: "accepted" }
  }

  async startTask(applicationId: string) {
    await this.updateTaskApplications([{
      id: applicationId,
      status: "in_progress",
      started_at: new Date(),
    }])
    return { id: applicationId, status: "in_progress" }
  }

  async submitTask(applicationId: string, proofUrl?: string, proofNotes?: string) {
    await this.updateTaskApplications([{
      id: applicationId,
      status: "submitted",
      submitted_at: new Date(),
      proof_url: proofUrl || null,
      proof_notes: proofNotes || null,
    }])
    return { id: applicationId, status: "submitted" }
  }

  async approveTask(applicationId: string, rating?: number, feedback?: string) {
    const [app] = await this.listTaskApplications({ id: [applicationId] })
    if (!app) throw new Error("Application not found")
    if (app.status !== "submitted") throw new Error("Task must be submitted before approval")

    const [task] = await this.listTasks({ id: [app.task_id] })
    if (!task) throw new Error("Task not found")

    const rewardCredits = Number(task.reward_credits) || 0

    await this.updateTaskApplications([{
      id: applicationId,
      status: "approved",
      completed_at: new Date(),
      credits_earned: rewardCredits,
      rating_by_poster: rating || null,
      feedback_by_poster: feedback || null,
    }])

    // Check if all applications are done
    const pending = await this.listTaskApplications({
      task_id: [app.task_id],
      status: ["accepted", "in_progress", "submitted"],
    })
    if (pending.length === 0) {
      await this.updateTasks([{ id: app.task_id, status: "completed" }])
    }

    return {
      id: applicationId,
      status: "approved",
      credits_earned: rewardCredits,
      applicant_id: app.applicant_id,
      task_id: app.task_id,
    }
  }

  async rejectTask(applicationId: string, reason: string) {
    await this.updateTaskApplications([{
      id: applicationId,
      status: "rejected",
      rejection_reason: reason,
    }])
    return { id: applicationId, status: "rejected" }
  }

  // ── My Tasks (for teens) ──────────────────────────────────────────────────

  async getMyApplications(userId: string, status?: string) {
    const filter: any = { applicant_id: [userId] }
    if (status) filter.status = [status]
    return this.listTaskApplications(filter, { order: { created_at: "DESC" } })
  }

  async getMyPostedTasks(userId: string) {
    return this.listTasks({ posted_by: [userId] }, { order: { created_at: "DESC" } })
  }
}

export default BarterTasksModuleService
