import { model } from "@medusajs/framework/utils"

export const SeekerProfile = model.define("job_seeker_profile", {
  id: model.id().primaryKey(),
  customer_id: model.text().nullable(),
  full_name: model.text(),
  headline: model.text().nullable(),
  skills: model.text().nullable(),
  experience_years: model.number().default(0),
  current_company: model.text().nullable(),
  current_designation: model.text().nullable(),
  education: model.text().nullable(),
  resume_url: model.text().nullable(),
  preferred_locations: model.text().nullable(),
  preferred_salary_min: model.number().nullable(),
  preferred_salary_max: model.number().nullable(),
  notice_period_days: model.number().default(30),
  is_active: model.boolean().default(true),
})
