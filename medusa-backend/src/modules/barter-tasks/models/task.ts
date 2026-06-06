import { model } from "@medusajs/framework/utils"

/**
 * Task - A unit of work posted by a brand/partner or peer.
 * Teens pick up tasks, complete them, and earn credits.
 */
export const Task = model.define("barter_task", {
  id: model.id().primaryKey(),
  posted_by: model.text(),             // user_id of poster (brand/partner/peer)
  poster_type: model.text().default("partner"), // "partner" | "peer" | "community" | "platform"
  title: model.text(),
  description: model.text().nullable(),
  category: model.text(),              // "digital" | "creative" | "peer_help" | "local" | "community"
  subcategory: model.text().nullable(),
  reward_credits: model.number(),      // BRT credits offered
  estimated_minutes: model.number().default(30),
  difficulty: model.text().default("easy"), // "easy" | "medium" | "hard"
  min_age: model.number().default(14),
  max_age: model.number().default(25),
  skills_required: model.text().nullable(), // comma-separated
  location_type: model.text().default("remote"), // "remote" | "local" | "both"
  locality: model.text().nullable(),
  max_applicants: model.number().default(1),
  current_applicants: model.number().default(0),
  status: model.text().default("open"), // "open" | "in_progress" | "completed" | "cancelled" | "expired"
  deadline: model.dateTime().nullable(),
  instructions_url: model.text().nullable(),
  verification_type: model.text().default("self_report"), // "self_report" | "photo_proof" | "peer_review" | "auto"
  is_recurring: model.boolean().default(false),
  recurrence_rule: model.text().nullable(), // cron-like or "daily" | "weekly"
  tags: model.text().nullable(),
  is_active: model.boolean().default(true),
})
