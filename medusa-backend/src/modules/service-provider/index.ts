import { Module } from "@medusajs/framework/utils"
import ServiceProviderModuleService from "./services/service-provider-module-service"

export const SERVICE_PROVIDER_MODULE = "serviceProviderModuleService"

export default Module(SERVICE_PROVIDER_MODULE, {
  service: ServiceProviderModuleService,
})

export { ServiceCategory } from "./models/service-category"
export { ServiceProvider } from "./models/service-provider"
export { ProviderService, ServiceVariant, ServiceAddon } from "./models/provider-service"
export { Appointment, AppointmentAddon } from "./models/appointment"
export { default as ServiceProviderModuleService } from "./services/service-provider-module-service"
