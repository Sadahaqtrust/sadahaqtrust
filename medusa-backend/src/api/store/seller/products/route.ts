/**
 * GET  /store/seller/products?channel={handle}
 * POST /store/seller/products
 *
 * Requirements: 1.1, 1.2, 1.7, 1.8
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { requireRole } from "../../../../lib/auth";
import { resolveSellerStore } from "../../../../lib/seller";
import type { ApiError } from "../../../../types/platform";

// ────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────

const MEDUSA_URL = process.env.MEDUSA_INTERNAL_URL || "http://127.0.0.1:9000";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";
const MEDUSA_ADMIN_TOKEN = process.env.MEDUSA_ADMIN_TOKEN || "";

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-medusa-token": MEDUSA_ADMIN_TOKEN,
    Authorization: `Bearer ${MEDUSA_ADMIN_TOKEN}`,
  };
}

async function medusaAdminGet(path: string): Promise<any> {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: "GET",
    headers: adminHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `GET ${path} failed`);
  return data;
}

async function medusaAdminPost(path: string, body: any): Promise<any> {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `POST ${path} failed`);
  return data;
}

// ────────────────────────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  errors: ApiError[];
}

function validateProductInput(body: any): ValidationResult {
  const errors: ApiError[] = [];

  if (!body.title || typeof body.title !== "string" || body.title.trim().length < 1) {
    errors.push({ error: "Title is required", code: "VALIDATION_ERROR", field: "title" });
  } else if (body.title.trim().length > 255) {
    errors.push({ error: "Title must be 255 characters or fewer", code: "VALIDATION_ERROR", field: "title" });
  }

  if (!body.description || typeof body.description !== "string" || body.description.trim().length < 1) {
    errors.push({ error: "Description is required", code: "VALIDATION_ERROR", field: "description" });
  } else if (body.description.trim().length > 5000) {
    errors.push({ error: "Description must be 5000 characters or fewer", code: "VALIDATION_ERROR", field: "description" });
  }

  const price = Number(body.price);
  if (!body.price || isNaN(price) || price <= 0) {
    errors.push({ error: "Price must be greater than 0", code: "VALIDATION_ERROR", field: "price" });
  }

  if (!body.variants || !Array.isArray(body.variants) || body.variants.length < 1) {
    errors.push({ error: "At least one variant is required", code: "VALIDATION_ERROR", field: "variants" });
  }

  return { valid: errors.length === 0, errors };
}

// ────────────────────────────────────────────────────────────────
// GET /store/seller/products?channel={handle}
// Requirements: 1.1, 1.8
// ────────────────────────────────────────────────────────────────

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const result = await requireRole(req, ["seller"]);
  if (result === null) return res.status(401).json({ error: "Unauthorized" } as ApiError);
  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" } as ApiError);
  const customerId = result;

  const { channel } = req.query as { channel?: string };
  if (!channel) {
    return res.status(400).json({
      error: "channel query parameter is required",
      code: "MISSING_CHANNEL",
    } as ApiError);
  }

  const store = await resolveSellerStore(customerId, channel);
  if (!store) {
    return res.status(403).json({
      error: "You do not have access to this channel",
      code: "CHANNEL_FORBIDDEN",
    } as ApiError);
  }

  try {
    // Proxy to Medusa admin product API, filtering by sales_channel
    const data = await medusaAdminGet(
      `/admin/products?sales_channel_id[]=${store.sales_channel_id}&limit=100&offset=0`,
    );
    return res.json({ products: data.products ?? [], count: data.count ?? 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch products" } as ApiError);
  }
}

// ────────────────────────────────────────────────────────────────
// POST /store/seller/products
// Requirements: 1.2, 1.7, 1.8
// ────────────────────────────────────────────────────────────────

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const result = await requireRole(req, ["seller"]);
  if (result === null) return res.status(401).json({ error: "Unauthorized" } as ApiError);
  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" } as ApiError);
  const customerId = result;

  const body = req.body as any;

  // Server-side validation (mirrors client-side schema)
  const validation = validateProductInput(body);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.errors[0].error,
      code: "VALIDATION_ERROR",
      field: validation.errors[0].field,
      errors: validation.errors,
    });
  }

  const { channel } = req.query as { channel?: string };
  const channelHandle: string = channel || body.channel || "";
  if (!channelHandle) {
    return res.status(400).json({
      error: "channel is required",
      code: "MISSING_CHANNEL",
    } as ApiError);
  }

  const store = await resolveSellerStore(customerId, channelHandle);
  if (!store) {
    return res.status(403).json({
      error: "You do not have access to this channel",
      code: "CHANNEL_FORBIDDEN",
    } as ApiError);
  }

  try {
    const productPayload = {
      title: body.title.trim(),
      description: body.description.trim(),
      status: body.status || "draft",
      variants: (body.variants as any[]).map((v: any) => ({
        title: v.title || "Default",
        prices: [{ amount: Math.round(Number(body.price) * 100), currency_code: "inr" }],
        ...v,
      })),
      sales_channels: [{ id: store.sales_channel_id }],
    };

    const data = await medusaAdminPost("/admin/products", productPayload);
    return res.status(201).json({ product: data.product });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create product" } as ApiError);
  }
}
