import { model } from "@medusajs/framework/utils";

export const DeliveryPayload = model.define("delivery_payload", {
  id: model.id().primaryKey(),
  delivery_order_id: model.text(),
  // Item details ported from Fleetbase Payload
  name: model.text(),
  quantity: model.number().default(1),
  weight: model.float().nullable(),   // kg
  volume: model.float().nullable(),   // liters
  price: model.float().default(0),
  currency: model.text().default("INR"),
  sku: model.text().nullable(),
  metadata: model.json().nullable(),
});
