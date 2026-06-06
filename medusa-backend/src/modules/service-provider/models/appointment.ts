import { model } from "@medusajs/framework/utils"

export const Appointment = model.define("appointment", {
  id: model.id().primaryKey(),
  customer_id: model.text().nullable(),
  provider_id: model.text(),
  service_id: model.text(),
  variant_id: model.text().nullable(),
  scheduled_date: model.text(),
  scheduled_time: model.text(),
  duration_minutes: model.number(),
  location_type: model.text(),
  customer_address: model.text().nullable(),
  customer_lat: model.number().nullable(),
  customer_lng: model.number().nullable(),
  status: model.text().default("pending"),
  base_amount: model.number(),
  addons_amount: model.number().default(0),
  home_visit_charge: model.number().default(0),
  discount_amount: model.number().default(0),
  total_amount: model.number(),
  deposit_amount: model.number().default(0),
  payment_status: model.text().default("unpaid"),
  payment_method: model.text().nullable(),
  razorpay_order_id: model.text().nullable(),
  razorpay_payment_id: model.text().nullable(),
  notes: model.text().nullable(),
  cancelled_by: model.text().nullable(),
  cancellation_reason: model.text().nullable(),
  completed_at: model.dateTime().nullable(),
})

export const AppointmentAddon = model.define("appointment_addon", {
  id: model.id().primaryKey(),
  appointment_id: model.text(),
  addon_id: model.text().nullable(),
  name: model.text(),
  price: model.number(),
})
