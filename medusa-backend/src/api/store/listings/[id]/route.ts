import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LISTINGS_MODULE } from "../../../../modules/listings"

// GET /store/listings/:id — view single listing
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(LISTINGS_MODULE) as any
  const { id } = req.params

  const listing = await svc.retrieveListing(id)
  if (!listing) return res.status(404).json({ error: "Listing not found" })

  // Increment views
  await svc.updateListings({ id, views_count: (listing.views_count || 0) + 1 })

  res.json({ listing })
}

// PUT /store/listings/:id — update listing
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(LISTINGS_MODULE) as any
  const { id } = req.params

  const updated = await svc.updateListings({ id, ...(req.body as any) })
  res.json({ listing: updated })
}

// DELETE /store/listings/:id — soft close
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(LISTINGS_MODULE) as any
  const { id } = req.params

  await svc.updateListings({ id, status: "closed" })
  res.json({ success: true })
}

// POST /store/listings/:id — respond/apply to a listing
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(LISTINGS_MODULE) as any
  const { id } = req.params
  const body = req.body as any

  if (!body.responder_name) {
    return res.status(400).json({ error: "responder_name is required" })
  }

  const response = await svc.createListingResponses({
    listing_id: id,
    ...body,
  })

  // Increment response count
  const listing = await svc.retrieveListing(id)
  await svc.updateListings({ id, responses_count: (listing.responses_count || 0) + 1 })

  res.status(201).json({ response })
}
