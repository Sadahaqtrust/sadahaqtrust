import { model } from "@medusajs/framework/utils";

export const TimeSlot = model.define("delivery_time_slot", {
  id: model.id().primaryKey(),
  label: model.text(), // "Today 10:00 - 12:00"
  slot_date: model.text(), // "2026-05-05"
  start_time: model.text(), // "10:00"
  end_time: model.text(),   // "12:00"
  max_orders: model.number().default(20),
  booked_orders: model.number().default(0),
  is_active: model.boolean().default(true),
  zone_id: model.text().nullable(),
});
