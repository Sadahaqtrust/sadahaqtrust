import { model } from "@medusajs/framework/utils"

export const ProviderService = model.define("provider_service", {
  id: model.id().primaryKey(),
  provider_id: model.text(),
  category_id: model.text().nullable(),
  name: model.text(),
  description: model.text().nullable(),
  duration_minutes: model.number().default(60),
  base_price: model.number(),
  service_location: model.text().default("Both"),
  images: model.text().nullable(),
  tags: model.text().nullable(),
  is_active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

export const ServiceVariant = model.define("service_variant", {
  id: model.id().primaryKey(),
  service_id: model.text(),
  name: model.text(),
  price: model.number(),
  duration_minutes: model.number().nullable(),
  is_active: model.boolean().default(true),
})

export const ServiceAddon = model.define("service_addon", {
  id: model.id().primaryKey(),
  service_id: model.text(),
  name: model.text(),
  price: model.number(),
  is_active: model.boolean().default(true),
})
