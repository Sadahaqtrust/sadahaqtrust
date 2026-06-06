import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LISTINGS_MODULE } from "../../../../modules/listings"

// GET /store/listings/search?q=developer&service_type=jobs&city=Rohtak&price_min=10000&price_max=50000
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(LISTINGS_MODULE) as any
  const { q, service_type, poster_role, category, city, price_min, price_max, limit = "20", offset = "0" } = req.query as Record<string, string>

  const filters: Record<string, any> = { status: "active" }
  if (service_type) filters.service_type = service_type
  if (poster_role) filters.poster_role = poster_role
  if (category) filters.category = category
  if (city) filters.city = city

  let listings = await svc.listListings(filters, {
    take: 200, // fetch more for client-side filtering
    skip: Number(offset) || 0,
    order: { created_at: "DESC" },
  })

  // Text search
  if (q) {
    const query = q.toLowerCase()
    listings = listings.filter((l: any) =>
      l.title?.toLowerCase().includes(query) ||
      l.tags?.toLowerCase().includes(query) ||
      l.description?.toLowerCase().includes(query) ||
      l.category?.toLowerCase().includes(query) ||
      l.subcategory?.toLowerCase().includes(query)
    )
  }

  // Price range filter
  if (price_min) listings = listings.filter((l: any) => (l.price_max || 0) >= Number(price_min))
  if (price_max) listings = listings.filter((l: any) => (l.price_min || 0) <= Number(price_max))

  // Paginate
  const total = listings.length
  listings = listings.slice(0, Math.min(Number(limit) || 20, 100))

  res.json({ listings, total })
}
