import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_PROVIDER_MODULE } from "../../../../modules/service-provider"

// PATCH /store/appointments/:id
export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(SERVICE_PROVIDER_MODULE) as any
  const { status, cancelled_by, cancellation_reason } = req.body as any
  const result = await svc.updateAppointmentStatus(
    req.params.id, status, cancelled_by, cancellation_reason
  )
  res.json({ appointment: result })
}
