import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

// GET /store/providers/posts/:postId/comments
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { postId } = req.params
  const result = await pool.query(
    `SELECT * FROM provider_post_comment WHERE post_id=$1 AND deleted_at IS NULL ORDER BY created_at ASC`,
    [postId]
  )
  res.json({ comments: result.rows })
}

// POST /store/providers/posts/:postId/comments
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { postId } = req.params
  const { author_name, author_email, content, images } = req.body as any

  if (!content?.trim()) return res.status(400).json({ error: "content required" })

  // Validate images array — only image URLs allowed (no video/audio)
  if (images && Array.isArray(images)) {
    for (const img of images) {
      if (typeof img !== "string" || !img.startsWith("http")) {
        return res.status(400).json({ error: "Invalid image URL" })
      }
    }
  }

  // Check post exists
  const postCheck = await pool.query("SELECT id FROM provider_post WHERE id=$1 AND deleted_at IS NULL", [postId])
  if (!postCheck.rows.length) return res.status(404).json({ error: "Post not found" })

  const id = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const result = await pool.query(
    `INSERT INTO provider_post_comment (id, post_id, author_name, author_email, content, images)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, postId, author_name || "Anonymous", author_email || null, content.trim(), images || null]
  )
  res.status(201).json({ comment: result.rows[0] })
}
