import { Module } from "@medusajs/framework/utils"
import JobPortalModuleService from "./services/job-portal-module-service"

export const JOB_PORTAL_MODULE = "jobPortalModuleService"

export default Module(JOB_PORTAL_MODULE, {
  service: JobPortalModuleService,
})

export { EmployerProfile } from "./models/employer-profile"
export { SeekerProfile } from "./models/seeker-profile"
export { JobListing } from "./models/job-listing"
export { JobApplication } from "./models/job-application"
export { default as JobPortalModuleService } from "./services/job-portal-module-service"
