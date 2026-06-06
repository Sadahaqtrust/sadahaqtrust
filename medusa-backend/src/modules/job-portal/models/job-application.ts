import { model } from "@medusajs/framework/utils"

export const JobApplication = model.define("job_application", {
  id: model.id().primaryKey(),
  job_id: model.text(),
  seeker_id: model.text(),
  cover_letter: model.text().nullable(),
  resume_url: model.text().nullable(),
  status: model.text().default("applied"),
  applied_at: model.dateTime().nullable(),
  status_updated_at: model.dateTime().nullable(),
  employer_notes: model.text().nullable(),
})
