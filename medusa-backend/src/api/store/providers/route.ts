import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_PROVIDER_MODULE } from "../../../modules/service-provider"

// GET /store/providers?category_id=&locality=
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(SERVICE_PROVIDER_MODULE) as any
  const { category_id, locality, all } = req.query as any

  // all=true returns every provider regardless of verified/active status
  const filters: any = { category_id, locality }
  if (all !== "true") filters.is_active = true

  const providers = await svc.browseProviders(filters)
  res.json({ providers })
}

// POST /store/providers — self-registration
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(SERVICE_PROVIDER_MODULE) as any
  const provider = await svc.registerProvider(req.body as any)
  res.status(201).json({ provider })
}
