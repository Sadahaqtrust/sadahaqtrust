import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_PROVIDER_MODULE } from "../../../modules/service-provider"

// GET /store/appointments?provider_id=&date=  → available slots
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(SERVICE_PROVIDER_MODULE) as any
  const { provider_id, date } = req.query as any
  if (!provider_id || !date) {
    return res.status(400).json({ error: "provider_id and date required" })
  }
  const slots = await svc.getAvailableSlots(Number(provider_id), date)
  res.json({ slots })
}

// POST /store/appointments — book appointment
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(SERVICE_PROVIDER_MODULE) as any
  const appointment = await svc.bookAppointment(req.body as any)
  res.status(201).json({ appointment })
}
