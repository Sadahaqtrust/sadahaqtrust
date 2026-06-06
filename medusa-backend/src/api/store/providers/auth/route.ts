import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import * as bcrypt from "bcryptjs"
import * as jwt from "jsonwebtoken"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const JWT_SECRET = process.env.JWT_SECRET || "supersecret"

// POST /store/providers/auth
// body: { action: "register"|"login", provider_id?, email?, mobile?, pin }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { action, provider_id, email, mobile, pin } = req.body as any

  if (!pin || pin.toString().length !== 4) {
    return res.status(400).json({ error: "PIN must be exactly 4 digits" })
  }

  if (action === "register") {
    if (!provider_id) return res.status(400).json({ error: "provider_id required" })

    // Check provider exists
    const pCheck = await pool.query("SELECT id FROM service_provider WHERE id=$1", [provider_id])
    if (!pCheck.rows.length) return res.status(404).json({ error: "Provider not found" })

    // Check if auth already exists for this mobile/email — single sign-on
    // Same person registering for multiple services reuses the same auth entry
    const existing = await pool.query(
      "SELECT id, provider_id FROM provider_auth WHERE (email=$1 OR mobile=$2) AND type='seller' AND deleted_at IS NULL",
      [email || null, mobile || null]
    )

    if (existing.rows.length) {
      // Auth already exists — link this new provider_id to the existing auth
      // Update the provider_id to point to the latest registration (or keep first)
      // For single sign-on: the login will return all provider profiles for this user
      return res.status(200).json({ message: "Auth already exists — single sign-on active. Use existing PIN to login." })
    }

    const pin_hash = await bcrypt.hash(pin.toString(), 10)
    const id = `pauth_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    await pool.query(
      "INSERT INTO provider_auth (id, provider_id, email, mobile, pin_hash, type) VALUES ($1,$2,$3,$4,$5,'seller')",
      [id, provider_id, email || null, mobile || null, pin_hash]
    )
    return res.status(201).json({ message: "Auth registered successfully" })
  }

  if (action === "login") {
    if (!email && !mobile) return res.status(400).json({ error: "email or mobile required" })

    // Find auth entry
    const authResult = await pool.query(
      `SELECT pa.id, pa.provider_id, pa.pin_hash, pa.email, pa.mobile
       FROM provider_auth pa
       WHERE (pa.email=$1 OR pa.mobile=$2) AND pa.type='seller' AND pa.deleted_at IS NULL AND pa.is_active=true
       LIMIT 1`,
      [email || null, mobile || null]
    )

    if (!authResult.rows.length) return res.status(401).json({ error: "Invalid credentials" })

    const auth = authResult.rows[0]
    const valid = await bcrypt.compare(pin.toString(), auth.pin_hash)
    if (!valid) return res.status(401).json({ error: "Invalid PIN" })

    await pool.query("UPDATE provider_auth SET last_login_at=NOW() WHERE id=$1", [auth.id])

    // Fetch ALL provider profiles for this mobile (multi-service support)
    const profilesResult = await pool.query(
      `SELECT sp.id, sp.full_name, sp.category_id, sp.is_verified, sp.is_active, sp.locality, sc.name as category_name
       FROM service_provider sp
       LEFT JOIN service_category sc ON sc.id = sp.category_id
       WHERE sp.mobile=$1 AND sp.deleted_at IS NULL
       ORDER BY sp.created_at DESC`,
      [auth.mobile || mobile]
    )

    const token = jwt.sign(
      { provider_id: auth.provider_id, mobile: auth.mobile, email: auth.email, type: "seller" },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    return res.json({
      token,
      providers: profilesResult.rows,
      activeProvider: profilesResult.rows[0] || null,
    })
  }

  return res.status(400).json({ error: "action must be register or login" })
}
