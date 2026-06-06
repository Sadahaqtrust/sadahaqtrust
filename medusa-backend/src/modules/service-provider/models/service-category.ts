import { model } from "@medusajs/framework/utils"

export const ServiceCategory = model.define("service_category", {
  id: model.id().primaryKey(),
  parent_id: model.number().nullable(),
  name: model.text(),
  slug: model.text(),
  icon: model.text().nullable(),
  sort_order: model.number().default(0),
  is_active: model.boolean().default(true),
})
