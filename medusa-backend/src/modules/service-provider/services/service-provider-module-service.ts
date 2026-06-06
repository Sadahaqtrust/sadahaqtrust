import { MedusaService } from "@medusajs/framework/utils"
import { ServiceCategory } from "../models/service-category"
import { ServiceProvider } from "../models/service-provider"
import { ProviderService, ServiceVariant, ServiceAddon } from "../models/provider-service"
import { Appointment, AppointmentAddon } from "../models/appointment"

class ServiceProviderModuleService extends MedusaService({
  ServiceCategory,
  ServiceProvider,
  ProviderService,
  ServiceVariant,
  ServiceAddon,
  Appointment,
  AppointmentAddon,
}) {

  // ── Categories ────────────────────────────────────────────────────────────

  async getCategories(parentId?: number) {
    const filter: any = { is_active: [true] }
    if (parentId !== undefined) filter.parent_id = [parentId]
    return this.listServiceCategories(filter, { order: { sort_order: "ASC" } })
  }

  async getCategoryTree() {
    const all = await this.listServiceCategories({ is_active: [true] }, { order: { sort_order: "ASC" } })
    const top = all.filter((c: any) => !c.parent_id)
    return top.map((cat: any) => ({
      ...cat,
      subcategories: all.filter((c: any) => c.parent_id === cat.id),
    }))
  }

  // ── Provider Registration ─────────────────────────────────────────────────

  async registerProvider(input: {
    full_name: string
    mobile: string
    email?: string
    gender?: string
    category_id?: number
    locality?: string
    address?: string
    pincode?: string
    experience_years?: number
    short_bio?: string
    service_location?: string
    working_days?: string
    working_hours_start?: string
    working_hours_end?: string
    slot_duration_minutes?: number
    accepts_cash?: boolean
    accepts_upi?: boolean
    whatsapp_number?: string
  }) {
    // Check if same mobile + same category already registered
    const existing = await this.listServiceProviders({
      mobile: [input.mobile],
      ...(input.category_id ? { category_id: [input.category_id] } : {}),
    })
    if (existing.length) throw new Error("Already registered for this service category with this mobile")

    const [provider] = await this.createServiceProviders([{
      ...input,
      is_active: false,
      is_verified: false,
    }])
    return provider
  }

  // ── Provider Browse ───────────────────────────────────────────────────────

  async browseProviders(filters: {
    category_id?: string
    locality?: string
    is_active?: boolean
  }) {
    const filter: any = {}
    if (filters.is_active !== undefined) filter.is_active = [filters.is_active]
    if (filters.category_id) filter.category_id = [filters.category_id]
    if (filters.locality) filter.locality = [filters.locality]

    return this.listServiceProviders(filter, {
      order: { rating_avg: "DESC", total_bookings: "DESC" },
    })
  }

  async getProviderWithServices(providerId: number) {
    const [provider] = await this.listServiceProviders({ id: [providerId] })
    if (!provider) throw new Error("Provider not found")

    const services = await this.listProviderServices(
      { provider_id: [providerId], is_active: [true] },
      { order: { sort_order: "ASC" } }
    )

    const serviceIds = services.map((s: any) => s.id)
    const variants = serviceIds.length
      ? await this.listServiceVariants({ service_id: serviceIds, is_active: [true] })
      : []
    const addons = serviceIds.length
      ? await this.listServiceAddons({ service_id: serviceIds, is_active: [true] })
      : []

    return {
      ...provider,
      services: services.map((svc: any) => ({
        ...svc,
        variants: variants.filter((v: any) => v.service_id === svc.id),
        addons: addons.filter((a: any) => a.service_id === svc.id),
      })),
    }
  }

  // ── Service Listing ───────────────────────────────────────────────────────

  async addService(input: {
    provider_id: number
    category_id?: number
    name: string
    description?: string
    duration_minutes: number
    base_price: number
    service_location?: string
    tags?: string
    variants?: { name: string; price: number; duration_minutes?: number }[]
    addons?: { name: string; price: number }[]
  }) {
    const { variants, addons, ...serviceData } = input
    const [service] = await this.createProviderServices([serviceData])

    if (variants?.length) {
      await this.createServiceVariants(variants.map(v => ({ ...v, service_id: service.id })))
    }
    if (addons?.length) {
      await this.createServiceAddons(addons.map(a => ({ ...a, service_id: service.id })))
    }
    return this.getProviderWithServices(input.provider_id)
  }

  // ── Availability ──────────────────────────────────────────────────────────

  async getAvailableSlots(providerId: number, date: string): Promise<string[]> {
    const [provider] = await this.listServiceProviders({ id: [providerId] })
    if (!provider || !provider.working_hours_start || !provider.working_hours_end) return []

    const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "short" })
    const workingDays = (provider.working_days || "").split(",").map((d: string) => d.trim())
    if (!workingDays.includes(dayName)) return []

    const booked = await this.listAppointments({
      provider_id: [providerId],
      scheduled_date: [date],
      status: ["pending", "confirmed", "in_progress"],
    })
    const bookedTimes = booked.map((a: any) => a.scheduled_time)

    const slots: string[] = []
    const [startH, startM] = provider.working_hours_start.split(":").map(Number)
    const [endH, endM] = provider.working_hours_end.split(":").map(Number)
    const slotDuration = provider.slot_duration_minutes || 60

    let current = startH * 60 + startM
    const end = endH * 60 + endM

    while (current + slotDuration <= end) {
      const h = String(Math.floor(current / 60)).padStart(2, "0")
      const m = String(current % 60).padStart(2, "0")
      const timeStr = `${h}:${m}`
      if (!bookedTimes.includes(timeStr)) slots.push(timeStr)
      current += slotDuration
    }
    return slots
  }

  // ── Book Appointment ──────────────────────────────────────────────────────

  async bookAppointment(input: {
    customer_id?: string
    provider_id: number
    service_id: number
    variant_id?: number
    scheduled_date: string
    scheduled_time: string
    location_type: string
    customer_address?: string
    customer_lat?: number
    customer_lng?: number
    notes?: string
    addon_ids?: number[]
  }) {
    const [provider] = await this.listServiceProviders({ id: [input.provider_id] })
    if (!provider) throw new Error("Provider not found")

    const [service] = await this.listProviderServices({ id: [input.service_id] })
    if (!service) throw new Error("Service not found")

    let base_amount = service.base_price
    let duration = service.duration_minutes

    if (input.variant_id) {
      const [variant] = await this.listServiceVariants({ id: [input.variant_id] })
      if (variant) {
        base_amount = variant.price
        duration = variant.duration_minutes || duration
      }
    }

    let addons_amount = 0
    const addonDetails: any[] = []
    if (input.addon_ids?.length) {
      const addons = await this.listServiceAddons({ id: input.addon_ids })
      for (const addon of addons) {
        addons_amount += addon.price
        addonDetails.push({ addon_id: addon.id, name: addon.name, price: addon.price })
      }
    }

    const home_visit_charge =
      input.location_type === "At customer home" ? provider.home_visit_charges || 0 : 0

    const total_amount = base_amount + addons_amount + home_visit_charge
    const deposit_amount = provider.deposit_required
      ? Math.round((total_amount * (provider.deposit_percent || 0)) / 100)
      : 0

    const [appointment] = await this.createAppointments([{
      customer_id: input.customer_id,
      provider_id: input.provider_id,
      service_id: input.service_id,
      variant_id: input.variant_id,
      scheduled_date: input.scheduled_date,
      scheduled_time: input.scheduled_time,
      duration_minutes: duration,
      location_type: input.location_type,
      customer_address: input.customer_address,
      customer_lat: input.customer_lat,
      customer_lng: input.customer_lng,
      status: "pending",
      base_amount,
      addons_amount,
      home_visit_charge,
      discount_amount: 0,
      total_amount,
      deposit_amount,
      payment_status: "unpaid",
      notes: input.notes,
    }])

    if (addonDetails.length) {
      await this.createAppointmentAddons(
        addonDetails.map(a => ({ ...a, appointment_id: appointment.id }))
      )
    }

    await this.updateServiceProviders([{
      id: input.provider_id,
      total_bookings: (provider.total_bookings || 0) + 1,
    }])

    return appointment
  }

  // ── Update Appointment Status ─────────────────────────────────────────────

  async updateAppointmentStatus(
    appointmentId: number,
    status: string,
    cancelledBy?: string,
    reason?: string
  ) {
    const [appt] = await this.listAppointments({ id: [appointmentId] })
    if (!appt) throw new Error("Appointment not found")

    const updates: any = { id: appointmentId, status }
    if (status === "completed") updates.completed_at = new Date()
    if (status === "cancelled") {
      updates.cancelled_by = cancelledBy
      updates.cancellation_reason = reason
    }

    await this.updateAppointments([updates])
    return { id: appointmentId, status }
  }

  // ── Admin: Verify Provider ────────────────────────────────────────────────

  async verifyProvider(providerId: number) {
    await this.updateServiceProviders([{
      id: providerId,
      is_verified: true,
      verified_at: new Date(),
      is_active: true,
    }])
    return { id: providerId, is_verified: true, is_active: true }
  }
}

export default ServiceProviderModuleService
