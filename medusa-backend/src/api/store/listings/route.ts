import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LISTINGS_MODULE } from "../../../modules/listings"

// GET /store/listings?service_type=jobs&poster_role=provider&category=IT&city=Rohtak&q=developer
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc = req.scope.resolve(LISTINGS_MODULE) as any
    const { service_type, poster_role, category, city, q, limit = "20", offset = "0" } = req.query as Record<string, string>

    const filters: Record<string, any> = { status: "active" }
    if (service_type) filters.service_type = service_type
    if (poster_role) filters.poster_role = poster_role
    if (category) filters.category = category
    if (city) filters.city = city

    let listings = await svc.listListings(filters, {
      take: Math.min(Number(limit) || 20, 100),
      skip: Number(offset) || 0,
      order: { created_at: "DESC" },
    })

    if (q) {
      const query = q.toLowerCase()
      listings = listings.filter((l: any) =>
        l.title?.toLowerCase().includes(query) ||
        l.tags?.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query)
      )
    }

    res.json({ listings, count: listings.length })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}

// POST /store/listings
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc = req.scope.resolve(LISTINGS_MODULE) as any
    const body = req.body as any

    if (!body.service_type || !body.poster_role || !body.title || !body.poster_name) {
      return res.status(400).json({ error: "service_type, poster_role, title, poster_name are required" })
    }

    const listing = await svc.createListings(body)
    res.status(201).json({ listing })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}
