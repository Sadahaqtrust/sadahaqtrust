import { model } from "@medusajs/framework/utils"

/**
 * Universal Listing model.
 * service_type differentiates: "jobs" | "property" | "matrimony" | "classifieds" | etc.
 * poster_role: "seeker" (looking for) | "provider" (offering)
 * Both sides publish & search — like Naukri where employers AND candidates post.
 */
export const Listing = model.define("listing", {
  id: model.id().primaryKey(),
  service_type: model.text(),            // "jobs" | "property" | "matrimony" | "classifieds"
  poster_role: model.text(),             // "seeker" | "provider"
  poster_id: model.text().nullable(),     // customer_id from Medusa auth (null for anonymous)
  poster_name: model.text(),
  poster_mobile: model.text().nullable(),
  poster_email: model.text().nullable(),
  title: model.text(),
  description: model.text().nullable(),
  category: model.text().nullable(),     // e.g. "IT", "2BHK", "Bride", "Electronics"
  subcategory: model.text().nullable(),
  locality: model.text().nullable(),
  city: model.text().default("Rohtak"),
  state: model.text().default("Haryana"),
  pincode: model.text().nullable(),
  lat: model.number().nullable(),
  lng: model.number().nullable(),
  price_min: model.number().nullable(),  // salary range / rent / price
  price_max: model.number().nullable(),
  price_unit: model.text().nullable(),   // "per_month" | "per_year" | "fixed" | "negotiable"
  images: model.text().nullable(),       // JSON array of URLs
  tags: model.text().nullable(),         // comma-separated for search
  attributes: model.text().nullable(),   // JSON — flexible key-value for service-specific fields
  status: model.text().default("active"),// "active" | "paused" | "closed" | "expired"
  is_featured: model.boolean().default(false),
  views_count: model.number().default(0),
  responses_count: model.number().default(0),
  expires_at: model.dateTime().nullable(),
})
