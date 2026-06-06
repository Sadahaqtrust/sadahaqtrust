import { model } from "@medusajs/framework/utils"

/**
 * TaskApplication - A teen applies to pick up a task.
 * Tracks the lifecycle from application to completion.
 */
export const TaskApplication = model.define("barter_task_application", {
  id: model.id().primaryKey(),
  task_id: model.text(),
  applicant_id: model.text(),          // user_id of the teen
  status: model.text().default("applied"), // "applied" | "accepted" | "in_progress" | "submitted" | "approved" | "rejected" | "cancelled"
  applied_at: model.dateTime().nullable(),
  accepted_at: model.dateTime().nullable(),
  started_at: model.dateTime().nullable(),
  submitted_at: model.dateTime().nullable(),
  completed_at: model.dateTime().nullable(),
  proof_url: model.text().nullable(),      // photo/link proof of completion
  proof_notes: model.text().nullable(),
  rejection_reason: model.text().nullable(),
  rating_by_poster: model.number().nullable(),  // 1-5
  rating_by_doer: model.number().nullable(),    // 1-5
  feedback_by_poster: model.text().nullable(),
  feedback_by_doer: model.text().nullable(),
  credits_earned: model.number().default(0),
})
