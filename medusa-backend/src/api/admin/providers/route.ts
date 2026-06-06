import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_PROVIDER_MODULE } from "../../../modules/service-provider"

// GET /admin/providers?is_verified=false
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(SERVICE_PROVIDER_MODULE) as any
  const { is_verified } = req.query as any
  const filter: any = {}
  if (is_verified !== undefined) filter.is_verified = [is_verified === "true"]
  const providers = await svc.listServiceProviders(filter, { order: { created_at: "DESC" } })
  res.json({ providers })
}
