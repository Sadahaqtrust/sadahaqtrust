import { MedusaService } from "@medusajs/framework/utils"
import { EmployerProfile } from "../models/employer-profile"
import { SeekerProfile } from "../models/seeker-profile"
import { JobListing } from "../models/job-listing"
import { JobApplication } from "../models/job-application"

class JobPortalModuleService extends MedusaService({
  EmployerProfile,
  SeekerProfile,
  JobListing,
  JobApplication,
}) {

  async searchJobs(filters: {
    keyword?: string
    location?: string
    experience?: number
    salary_min?: number
    salary_max?: number
    job_type?: string
  }) {
    const filter: any = { is_active: [true] }
    if (filters.job_type) filter.job_type = [filters.job_type]
    if (filters.location) filter.city = [filters.location]
    return this.listJobListings(filter, { order: { posted_at: "DESC" } })
  }

  async applyToJob(input: {
    seeker_id: string
    job_id: string
    cover_letter?: string
    resume_url?: string
  }) {
    const [application] = await this.createJobApplications([{
      ...input,
      status: "applied",
      applied_at: new Date(),
    }])
    return application
  }

  async getEmployerDashboard(employerId: string) {
    return this.listJobListings(
      { employer_id: [employerId] },
      { order: { posted_at: "DESC" } }
    )
  }

  async getSeekerApplications(seekerId: string) {
    return this.listJobApplications(
      { seeker_id: [seekerId] },
      { order: { applied_at: "DESC" } }
    )
  }

  async updateApplicationStatus(applicationId: string, status: string, notes?: string) {
    await this.updateJobApplications([{
      id: applicationId,
      status,
      employer_notes: notes,
      status_updated_at: new Date(),
    }])
    return { id: applicationId, status }
  }
}

export default JobPortalModuleService
