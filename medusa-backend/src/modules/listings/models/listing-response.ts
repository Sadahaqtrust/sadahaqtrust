import { model } from "@medusajs/framework/utils"

/**
 * ListingResponse — when a seeker applies to a provider's listing or vice versa.
 * Works for: job application, property inquiry, matrimony interest, buy request.
 */
export const ListingResponse = model.define("listing_response", {
  id: model.id().primaryKey(),
  listing_id: model.text(),
  responder_id: model.text(),            // customer_id
  responder_name: model.text(),
  responder_mobile: model.text().nullable(),
  responder_email: model.text().nullable(),
  message: model.text().nullable(),
  resume_url: model.text().nullable(),   // for jobs
  attributes: model.text().nullable(),   // JSON — flexible per service_type
  status: model.text().default("pending"), // "pending" | "viewed" | "shortlisted" | "rejected" | "accepted"
})
