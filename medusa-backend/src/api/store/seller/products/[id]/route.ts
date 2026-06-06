/**
 * PUT    /store/seller/products/{id}
 * DELETE /store/seller/products/{id}
 *
 * Requirements: 1.3, 1.4, 1.5, 1.8
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { requireRole } from "../../../../../lib/auth";
import { resolveSellerStore, countActiveOrdersForProduct } from "../../../../../lib/seller";
import type { ApiError } from "../../../../../types/platform";

// ────────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────────

const MEDUSA_URL = process.env.MEDUSA_INTERNAL_URL || "http://127.0.0.1:9000";
const MEDUSA_ADMIN_TOKEN = process.env.MEDUSA_ADMIN_TOKEN || "";

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-medusa-token": MEDUSA_ADMIN_TOKEN,
    Authorization: `Bearer ${MEDUSA_ADMIN_TOKEN}`,
  };
}

async function medusaAdminGet(path: string): Promise<any> {
  const res = await fetch(`${MEDUSA_URL}${path}`, { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `GET ${path} failed`);
  return data;
}

async function medusaAdminPost(path: string, body: any, method = "POST"): Promise<any> {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method,
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `${method} ${path} failed`);
  return data;
}

async function medusaAdminDelete(path: string): Promise<any> {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `DELETE ${path} failed`);
  return data;
}

// ────────────────────────────────────────────────────────────────
// Ownership verification
// Returns true if the product belongs to the seller's sales channel
// ────────────────────────────────────────────────────────────────

async function verifyProductOwnership(
  productId: string,
  salesChannelId: string,
): Promise<boolean> {
  try {
    const data = await medusaAdminGet(`/admin/products/${productId}`);
    const product = data.product;
    if (!product) return false;
    // Check if the product is associated with this sales channel
    const channels: any[] = product.sales_channels ?? [];
    return channels.some((sc: any) => sc.id === salesChannelId);
  } catch {
    return false;
  }
}

// ────────────────────────────────────────────────────────────────
// Validation (same rules as POST)
// ────────────────────────────────────────────────────────────────

function validateProductInput(body: any): { valid: boolean; errors: ApiError[] } {
  const errors: ApiError[] = [];

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length < 1) {
      errors.push({ error: "Title is required", code: "VALIDATION_ERROR", field: "title" });
    } else if (body.title.trim().length > 255) {
      errors.push({ error: "Title must be 255 characters or fewer", code: "VALIDATION_ERROR", field: "title" });
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.trim().length < 1) {
      errors.push({ error: "Description is required", code: "VALIDATION_ERROR", field: "description" });
    } else if (body.description.trim().length > 5000) {
      errors.push({ error: "Description must be 5000 characters or fewer", code: "VALIDATION_ERROR", field: "description" });
    }
  }

  if (body.price !== undefined) {
    const price = Number(body.price);
    if (isNaN(price) || price <= 0) {
      errors.push({ error: "Price must be greater than 0", code: "VALIDATION_ERROR", field: "price" });
    }
  }

  if (body.variants !== undefined) {
    if (!Array.isArray(body.variants) || body.variants.length < 1) {
      errors.push({ error: "At least one variant is required", code: "VALIDATION_ERROR", field: "variants" });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ────────────────────────────────────────────────────────────────
// PUT /store/seller/products/{id}
// Requirements: 1.3, 1.8
// ────────────────────────────────────────────────────────────────

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const result = await requireRole(req, ["seller"]);
  if (result === null) return res.status(401).json({ error: "Unauthorized" } as ApiError);
  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" } as ApiError);
  const customerId = result;

  const { id } = req.params as { id: string };
  const body = req.body as any;

  // Validate input (partial update — only validate fields provided)
  const validation = validateProductInput(body);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.errors[0].error,
      code: "VALIDATION_ERROR",
      field: validation.errors[0].field,
      errors: validation.errors,
    });
  }

  const channel: string = (req.query as any).channel || body.channel || "";
  if (!channel) {
    return res.status(400).json({
      error: "channel is required",
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

  // Enforce ownership
  const owns = await verifyProductOwnership(id, store.sales_channel_id);
  if (!owns) {
    return res.status(403).json({
      error: "Product not found or access denied",
      code: "PRODUCT_FORBIDDEN",
    } as ApiError);
  }

  try {
    const updatePayload: Record<string, any> = {};
    if (body.title) updatePayload.title = body.title.trim();
    if (body.description) updatePayload.description = body.description.trim();
    if (body.status) updatePayload.status = body.status;
    // Variant price updates are handled per-variant separately if provided
    if (body.variants) {
      updatePayload.variants = (body.variants as any[]).map((v: any) => ({
        title: v.title || "Default",
        prices: body.price
          ? [{ amount: Math.round(Number(body.price) * 100), currency_code: "inr" }]
          : v.prices,
        ...v,
      }));
    }

    const data = await medusaAdminPost(`/admin/products/${id}`, updatePayload, "POST");
    return res.json({ product: data.product });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to update product" } as ApiError);
  }
}

// ────────────────────────────────────────────────────────────────
// DELETE /store/seller/products/{id}
// Requirements: 1.4, 1.5, 1.8
// ────────────────────────────────────────────────────────────────

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const result = await requireRole(req, ["seller"]);
  if (result === null) return res.status(401).json({ error: "Unauthorized" } as ApiError);
  if (result === "forbidden") return res.status(403).json({ error: "Forbidden" } as ApiError);
  const customerId = result;

  const { id } = req.params as { id: string };
  const channel: string = (req.query as any).channel || "";
  if (!channel) {
    return res.status(400).json({
      error: "channel is required",
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

  // Enforce ownership
  const owns = await verifyProductOwnership(id, store.sales_channel_id);
  if (!owns) {
    return res.status(403).json({
      error: "Product not found or access denied",
      code: "PRODUCT_FORBIDDEN",
    } as ApiError);
  }

  // Active-order guard (Requirements 1.4, 1.5)
  const activeOrderCount = await countActiveOrdersForProduct(id);
  if (activeOrderCount > 0) {
    return res.status(409).json({
      error: "This product cannot be deleted while active orders exist",
      code: "PRODUCT_HAS_ACTIVE_ORDERS",
    } as ApiError);
  }

  try {
    await medusaAdminDelete(`/admin/products/${id}`);
    return res.json({ deleted: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to delete product" } as ApiError);
  }
}
