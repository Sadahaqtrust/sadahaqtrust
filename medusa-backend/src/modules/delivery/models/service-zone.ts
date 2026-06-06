import { model } from "@medusajs/framework/utils";

export const ServiceZone = model.define("delivery_service_zone", {
  id: model.id().primaryKey(),
  name: model.text(),
  city: model.text().default("Rohtak"),
  state: model.text().default("Haryana"),
  center_lat: model.float(),
  center_lng: model.float(),
  radius_km: model.float().default(10),
  is_active: model.boolean().default(true),
  base_charge: model.float().default(0),
  per_km_charge: model.float().default(5),
  free_delivery_above: model.float().default(500),
  metadata: model.json().nullable(),
});
