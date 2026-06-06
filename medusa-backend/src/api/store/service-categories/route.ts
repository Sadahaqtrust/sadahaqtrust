import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SERVICE_PROVIDER_MODULE } from "../../../modules/service-provider"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc = req.scope.resolve(SERVICE_PROVIDER_MODULE) as any
  const tree = await svc.getCategoryTree()
  res.json({ categories: tree })
}
