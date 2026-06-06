import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_PROVIDER_MODULE } from "../../../../../modules/service-provider"

// POST /admin/providers/:id/verify
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(SERVICE_PROVIDER_MODULE) as any
  const result = await svc.verifyProvider(req.params.id)
  res.json({ result })
}
