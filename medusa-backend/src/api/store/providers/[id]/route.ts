import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_PROVIDER_MODULE } from "../../../../modules/service-provider"

// GET /store/providers/:id
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(SERVICE_PROVIDER_MODULE) as any
  const provider = await svc.getProviderWithServices(req.params.id)
  res.json({ provider })
}
