import { model } from "@medusajs/framework/utils";

export const TrackingEvent = model.define("delivery_tracking_event", {
  id: model.id().primaryKey(),
  delivery_order_id: model.text(),
  status: model.text(),
  message: model.text().nullable(),
  message_hi: model.text().nullable(),
  lat: model.float().nullable(),
  lng: model.float().nullable(),
  metadata: model.json().nullable(),
});
