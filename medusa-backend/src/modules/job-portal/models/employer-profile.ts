import { model } from "@medusajs/framework/utils"

export const EmployerProfile = model.define("job_employer_profile", {
  id: model.id().primaryKey(),
  customer_id: model.text().nullable(),
  company_name: model.text(),
  industry: model.text().nullable(),
  website: model.text().nullable(),
  logo_url: model.text().nullable(),
  description: model.text().nullable(),
  city: model.text().default("Rohtak"),
  state: model.text().default("Haryana"),
  employee_count: model.text().nullable(),
  contact_name: model.text(),
  contact_email: model.text(),
  contact_mobile: model.text(),
  is_verified: model.boolean().default(false),
  is_active: model.boolean().default(true),
})
