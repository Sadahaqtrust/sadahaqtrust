import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import * as jwt from "jsonwebtoken"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const JWT_SECRET = process.env.JWT_SECRET || "supersecret"

function verifySellerToken(req: MedusaRequest): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) return null
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any
    return decoded.type === "seller" ? decoded.provider_id : null
  } catch { return null }
}

// GET /store/providers/:id/posts
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const result = await pool.query(
    `SELECT * FROM provider_post WHERE provider_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC`,
    [id]
  )
  res.json({ posts: result.rows })
}

// POST /store/providers/:id/posts — seller auth required
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const providerId = verifySellerToken(req)
  if (!providerId) return res.status(401).json({ error: "Seller login required" })
  if (providerId !== req.params.id) return res.status(403).json({ error: "Forbidden" })

  const { content, images } = req.body as any
  if (!content?.trim()) return res.status(400).json({ error: "content required" })

  const id = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const result = await pool.query(
    `INSERT INTO provider_post (id, provider_id, content, images) VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, providerId, content.trim(), images || null]
  )
  res.status(201).json({ post: result.rows[0] })
}
