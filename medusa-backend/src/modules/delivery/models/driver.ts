import { model } from "@medusajs/framework/utils";

export const Driver = model.define("delivery_driver", {
  id: model.id().primaryKey(),
  name: model.text(),
  phone: model.text(),
  email: model.text().nullable(),
  status: model.enum(["available", "busy", "offline"]).default("offline"),
  vehicle_type: model.enum(["bike", "scooter", "car", "van"]).default("bike"),
  vehicle_number: model.text().nullable(),
  rating: model.float().default(5.0),
  total_deliveries: model.number().default(0),
  is_active: model.boolean().default(true),
  last_lat: model.float().nullable(),
  last_lng: model.float().nullable(),
  last_location_at: model.dateTime().nullable(),
  // Extended fields (migration 002)
  user_id: model.text().nullable(),   // links Driver record to Medusa customer ID
  zone_id: model.text().nullable(),   // assigned ServiceZone
  upi_vpa: model.text().nullable(),   // rider's UPI VPA for disbursements
  metadata: model.json().nullable(),
});
