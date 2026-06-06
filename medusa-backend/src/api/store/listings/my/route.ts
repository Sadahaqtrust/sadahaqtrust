import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LISTINGS_MODULE } from "../../../../modules/listings"

// GET /store/listings/my?poster_id=xxx&service_type=jobs
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(LISTINGS_MODULE) as any
  const { poster_id, service_type } = req.query as Record<string, string>

  if (!poster_id) return res.status(400).json({ error: "poster_id required" })

  const filters: Record<string, any> = { poster_id }
  if (service_type) filters.service_type = service_type

  const listings = await svc.listListings(filters, { order: { created_at: "DESC" } })

  // For each listing, get response count
  const withResponses = await Promise.all(
    listings.map(async (l: any) => {
      const responses = await svc.listListingResponses({ listing_id: l.id })
      return { ...l, responses }
    })
  )

  res.json({ listings: withResponses })
}
