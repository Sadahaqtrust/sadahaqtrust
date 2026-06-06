import { model } from "@medusajs/framework/utils"

/**
 * UserBadge - Tracks which badges a user has earned.
 */
export const UserBadge = model.define("barter_user_badge", {
  id: model.id().primaryKey(),
  user_id: model.text(),
  badge_id: model.text(),
  earned_at: model.dateTime().nullable(),
  is_displayed: model.boolean().default(true), // user can choose to show/hide
})
