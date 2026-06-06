"use client";
/**
 * ProductManager — Seller Dashboard: Product Management
 *
 * On mount: fetches GET /store/seller/products?channel={handle}
 * Renders a product list with Add, Edit, Delete controls.
 * Add/Edit form uses manual Zod-equivalent validation:
 *   - title: 1–255 chars
 *   - description: 1–5000 chars
 *   - price: > 0 (in INR rupees, stored as paise)
 *   - variants: ≥ 1
 * Optimistic update on create/edit; rolls back on API failure with error toast.
 * Deletion guard: fetches active-order count first; if > 0 shows blocking error;
 * if 0 shows confirmation modal.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 1.8
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getStoredToken } from "@/lib/authCookies";
import type { SellerProduct, ProductVariant, ProductUpsertRequest } from "@/lib/types/platform";

// ── Constants ──────────────────────────────────────────────────────────────
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

// ── Types ──────────────────────────────────────────────────────────────────

interface FormVariant {
  id?: string;
  title: string;
  price: string; // string for controlled input; converted to paise on submit
  sku: string;
}

interface ProductFormData {
  title: string;
  description: string;
  price: string; // base price in rupees (display), converted to paise
  variants: FormVariant[];
}

interface FieldErrors {
  title?: string;
  description?: string;
  price?: string;
  variants?: string;
  [key: string]: string | undefined;
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateProductForm(data: ProductFormData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.title.trim()) {
    errors.title = "Title is required.";
  } else if (data.title.trim().length > 255) {
    errors.title = "Title must be 255 characters or fewer.";
  }

  if (!data.description.trim()) {
    errors.description = "Description is required.";
  } else if (data.description.trim().length > 5000) {
    errors.description = "Description must be 5,000 characters or fewer.";
  }

  const priceNum = parseFloat(data.price);
  if (!data.price || isNaN(priceNum) || priceNum <= 0) {
    errors.price = "Price must be greater than ₹0.";
  }

  const validVariants = data.variants.filter((v) => v.title.trim().length > 0);
  if (validVariants.length < 1) {
    errors.variants = "At least one variant is required.";
  }

  return errors;
}

// ── API helpers ────────────────────────────────────────────────────────────

function authHeaders() {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    "x-publishable-api-key": PUB_KEY,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchProducts(channel: string): Promise<SellerProduct[]> {
  const token = getStoredToken();
  const res = await fetch(
    `${MEDUSA_URL}/store/seller/products?channel=${encodeURIComponent(channel)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUB_KEY,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.products ?? data) as SellerProduct[];
}

async function createProduct(channel: string, body: ProductUpsertRequest): Promise<SellerProduct> {
  const res = await fetch(`${MEDUSA_URL}/store/seller/products`, {
    method: "POST",
    headers: { ...authHeaders(), "x-channel": channel },
    body: JSON.stringify({ ...body, channel }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as any).error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.product ?? data) as SellerProduct;
}

async function updateProduct(id: string, body: ProductUpsertRequest): Promise<SellerProduct> {
  const res = await fetch(`${MEDUSA_URL}/store/seller/products/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as any).error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return (data.product ?? data) as SellerProduct;
}

async function getActiveOrderCount(productId: string): Promise<number> {
  const token = getStoredToken();
  const res = await fetch(
    `${MEDUSA_URL}/store/seller/products/${productId}/active-orders`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PUB_KEY,
      },
    }
  );
  if (!res.ok) return 0;
  const data = await res.json();
  return (data.count ?? data.active_order_count ?? 0) as number;
}

async function deleteProduct(id: string): Promise<void> {
  const res = await fetch(`${MEDUSA_URL}/store/seller/products/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    const code = (b as any).code;
    if (code === "PRODUCT_HAS_ACTIVE_ORDERS") {
      throw new Error("Cannot delete: product has active orders.");
    }
    throw new Error((b as any).error || `HTTP ${res.status}`);
  }
}

// ── Sub-components ──────────────────────────────────────────────────────────

/** Toast notification */
function Toast({ message, type, onClose }: { message: string; type: "error" | "success"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm max-w-xs text-center ${
        type === "error" ? "bg-red-600" : "bg-green-600"
      }`}
      role="alert"
    >
      {message}
      <button
        onClick={onClose}
        className="ml-3 text-white/70 hover:text-white font-bold"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

/** Inline field error */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1" role="alert">{message}</p>;
}

// ── Default form state ──────────────────────────────────────────────────────
function defaultForm(): ProductFormData {
  return {
    title: "",
    description: "",
    price: "",
    variants: [{ title: "Default", price: "", sku: "" }],
  };
}

function productToFormData(p: SellerProduct): ProductFormData {
  const basePrice = p.variants[0]?.price
    ? String(p.variants[0].price / 100)
    : "";
  return {
    title: p.title,
    description: p.description,
    price: basePrice,
    variants: p.variants.map((v) => ({
      id: v.id,
      title: v.title,
      price: v.price ? String(v.price / 100) : "",
      sku: v.sku ?? "",
    })),
  };
}

// ── Product Form Modal ──────────────────────────────────────────────────────

interface ProductFormModalProps {
  mode: "add" | "edit";
  initial: ProductFormData;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onClose: () => void;
  submitting: boolean;
}

function ProductFormModal({ mode, initial, onSubmit, onClose, submitting }: ProductFormModalProps) {
  const [form, setForm] = useState<ProductFormData>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleChange(field: keyof ProductFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleVariantChange(idx: number, field: keyof FormVariant, value: string) {
    setForm((prev) => {
      const variants = [...prev.variants];
      variants[idx] = { ...variants[idx], [field]: value };
      return { ...prev, variants };
    });
    setErrors((prev) => ({ ...prev, variants: undefined }));
  }

  function addVariant() {
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { title: "", price: "", sku: "" }],
    }));
  }

  function removeVariant(idx: number) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateProductForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    await onSubmit(form);
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-2"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "add" ? "Add Product" : "Edit Product"}
    >
      <div className="bg-white rounded-2xl w-full max-w-[480px] overflow-y-auto max-h-[90vh] shadow-2xl">
        <div
          className="px-5 py-4 rounded-t-2xl flex items-center justify-between"
          style={{ backgroundColor: "#F47216" }}
        >
          <h2 className="text-white font-bold text-base">
            {mode === "add" ? "Add Product" : "Edit Product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl font-bold leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4" noValidate>
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="product-title">
              Product Title <span className="text-red-500">*</span>
            </label>
            <input
              id="product-title"
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              maxLength={255}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47216] ${
                errors.title ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
              placeholder="e.g. Paneer Butter Masala"
              aria-describedby={errors.title ? "title-error" : undefined}
              aria-invalid={!!errors.title}
            />
            <FieldError message={errors.title} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="product-desc">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="product-desc"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              maxLength={5000}
              rows={3}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47216] resize-none ${
                errors.description ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
              placeholder="Describe the product…"
              aria-invalid={!!errors.description}
            />
            <div className="flex justify-between items-center">
              <FieldError message={errors.description} />
              <span className="text-gray-400 text-xs ml-auto">{form.description.length}/5000</span>
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="product-price">
              Base Price (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
              <input
                id="product-price"
                type="number"
                value={form.price}
                onChange={(e) => handleChange("price", e.target.value)}
                min="0.01"
                step="0.01"
                className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47216] ${
                  errors.price ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
                placeholder="0.00"
                aria-invalid={!!errors.price}
              />
            </div>
            <FieldError message={errors.price} />
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">
                Variants <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addVariant}
                className="text-xs text-[#F47216] font-semibold hover:underline"
              >
                + Add Variant
              </button>
            </div>
            {errors.variants && (
              <p className="text-red-500 text-xs mb-2" role="alert">{errors.variants}</p>
            )}
            <div className="space-y-3">
              {form.variants.map((variant, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500">Variant {idx + 1}</span>
                    {form.variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className="ml-auto text-red-400 hover:text-red-600 text-xs font-bold"
                        aria-label={`Remove variant ${idx + 1}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={variant.title}
                    onChange={(e) => handleVariantChange(idx, "title", e.target.value)}
                    placeholder="Variant name (e.g. Regular)"
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#F47216] mb-2"
                    aria-label={`Variant ${idx + 1} name`}
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) => handleVariantChange(idx, "price", e.target.value)}
                        placeholder="Price"
                        min="0.01"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-md pl-5 pr-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#F47216]"
                        aria-label={`Variant ${idx + 1} price`}
                      />
                    </div>
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => handleVariantChange(idx, "sku", e.target.value)}
                      placeholder="SKU (optional)"
                      className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#F47216]"
                      aria-label={`Variant ${idx + 1} SKU`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#F47216" }}
            >
              {submitting ? "Saving…" : mode === "add" ? "Add Product" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ───────────────────────────────────────────────

interface DeleteModalProps {
  productTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteModal({ productTitle, onConfirm, onCancel, deleting }: DeleteModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm deletion"
    >
      <div className="bg-white rounded-2xl w-full max-w-[380px] shadow-2xl p-6">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🗑️</div>
          <h3 className="font-bold text-gray-800 text-base">Delete Product?</h3>
          <p className="text-gray-500 text-sm mt-1">
            <span className="font-semibold text-gray-700">{productTitle}</span> will be permanently removed.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product Card ────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: SellerProduct;
  onEdit: () => void;
  onDelete: () => void;
  isOptimistic?: boolean;
}

function ProductCard({ product, onEdit, onDelete, isOptimistic }: ProductCardProps) {
  const basePrice = product.variants[0]?.price ?? 0;
  const priceDisplay = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(basePrice / 100);

  return (
    <div
      className={`bg-white border rounded-xl p-4 shadow-sm transition-opacity ${
        isOptimistic ? "opacity-60 border-dashed border-[#F47216]" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-800 text-sm leading-tight truncate">
            {product.title}
          </h3>
          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">
            {product.description}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[#F47216] font-bold text-sm">{priceDisplay}</span>
            <span className="text-gray-400 text-xs">
              {product.variants.length} variant{product.variants.length !== 1 ? "s" : ""}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                product.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {product.status}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            disabled={isOptimistic}
            className="text-xs px-3 py-1.5 border border-[#F47216] text-[#F47216] font-semibold rounded-lg hover:bg-orange-50 disabled:opacity-40"
            aria-label={`Edit ${product.title}`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isOptimistic}
            className="text-xs px-3 py-1.5 border border-red-300 text-red-500 font-semibold rounded-lg hover:bg-red-50 disabled:opacity-40"
            aria-label={`Delete ${product.title}`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface ProductManagerProps {
  params: { channel: string };
}

export default function ProductManagerPage({ params }: ProductManagerProps) {
  const { channel } = params;

  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editTarget, setEditTarget] = useState<SellerProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Deletion state
  const [deleteTarget, setDeleteTarget] = useState<SellerProduct | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Optimistic IDs (temporary client-side IDs for products being created)
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());
  const optimisticCounter = useRef(0);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  function showToast(message: string, type: "error" | "success" = "error") {
    setToast({ message, type });
  }

  // ── Load products ─────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchProducts(channel);
      setProducts(data);
    } catch (err: any) {
      setLoadError(err.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openAddForm() {
    setFormMode("add");
    setEditTarget(null);
    setShowForm(true);
  }

  function openEditForm(product: SellerProduct) {
    setFormMode("edit");
    setEditTarget(product);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
  }

  function formDataToUpsertRequest(data: ProductFormData): ProductUpsertRequest {
    const pricePaise = Math.round(parseFloat(data.price) * 100);
    return {
      title: data.title.trim(),
      description: data.description.trim(),
      price: pricePaise,
      variants: data.variants
        .filter((v) => v.title.trim().length > 0)
        .map((v) => ({
          id: v.id,
          title: v.title.trim(),
          price: v.price ? Math.round(parseFloat(v.price) * 100) : pricePaise,
          sku: v.sku.trim() || undefined,
        })),
    };
  }

  // ── Create product (optimistic) ───────────────────────────────────────────
  async function handleCreate(data: ProductFormData) {
    setSubmitting(true);

    // Build a temporary optimistic product
    const tempId = `__optimistic_${++optimisticCounter.current}`;
    const pricePaise = Math.round(parseFloat(data.price) * 100);
    const optimisticProduct: SellerProduct = {
      id: tempId,
      title: data.title.trim(),
      description: data.description.trim(),
      status: "active",
      variants: data.variants
        .filter((v) => v.title.trim().length > 0)
        .map((v, i) => ({
          id: `${tempId}_v${i}`,
          title: v.title.trim(),
          price: v.price ? Math.round(parseFloat(v.price) * 100) : pricePaise,
          sku: v.sku.trim() || undefined,
        })),
    };

    // Optimistically add to list
    setProducts((prev) => [optimisticProduct, ...prev]);
    setOptimisticIds((prev) => new Set(Array.from(prev).concat(tempId)));
    closeForm();

    try {
      const body = formDataToUpsertRequest(data);
      const created = await createProduct(channel, body);
      // Replace optimistic entry with real one
      setProducts((prev) =>
        prev.map((p) => (p.id === tempId ? created : p))
      );
    } catch (err: any) {
      // Roll back optimistic entry
      setProducts((prev) => prev.filter((p) => p.id !== tempId));
      showToast(err.message || "Failed to create product. Please try again.");
    } finally {
      setOptimisticIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      setSubmitting(false);
    }
  }

  // ── Edit product (optimistic) ─────────────────────────────────────────────
  async function handleEdit(data: ProductFormData) {
    if (!editTarget) return;
    setSubmitting(true);

    const body = formDataToUpsertRequest(data);
    const optimisticUpdate: SellerProduct = {
      ...editTarget,
      title: body.title,
      description: body.description,
      variants: body.variants as ProductVariant[],
    };

    // Store original for rollback
    const original = editTarget;

    // Optimistically update
    setProducts((prev) =>
      prev.map((p) => (p.id === editTarget.id ? optimisticUpdate : p))
    );
    closeForm();

    try {
      const updated = await updateProduct(editTarget.id, body);
      setProducts((prev) =>
        prev.map((p) => (p.id === editTarget.id ? updated : p))
      );
    } catch (err: any) {
      // Roll back
      setProducts((prev) =>
        prev.map((p) => (p.id === original.id ? original : p))
      );
      showToast(err.message || "Failed to update product. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFormSubmit(data: ProductFormData) {
    if (formMode === "add") {
      await handleCreate(data);
    } else {
      await handleEdit(data);
    }
  }

  // ── Delete flow ───────────────────────────────────────────────────────────
  async function requestDelete(product: SellerProduct) {
    setDeleteError(null);
    // First check active order count
    try {
      const count = await getActiveOrderCount(product.id);
      if (count > 0) {
        setDeleteError(
          `Cannot delete "${product.title}" — it has ${count} active order${count !== 1 ? "s" : ""}. Please wait until all active orders are completed.`
        );
        return;
      }
    } catch {
      // If the active-order count endpoint fails, still allow deletion attempt
    }
    // No active orders → show confirmation
    setDeleteTarget(product);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast(`"${deleteTarget.title}" deleted.`, "success");
    } catch (err: any) {
      setDeleteTarget(null);
      showToast(err.message || "Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[480px] mx-auto">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Active-order blocking error */}
      {deleteError && (
        <div
          className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2"
          role="alert"
        >
          <span className="text-lg leading-none">⛔</span>
          <div className="flex-1">
            <p className="font-semibold">Cannot Delete Product</p>
            <p className="mt-0.5">{deleteError}</p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="text-red-400 hover:text-red-600 font-bold leading-none shrink-0"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-800">
          Products
          {!loading && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({products.length})
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={openAddForm}
          className="text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm"
          style={{ backgroundColor: "#F47216" }}
          aria-label="Add new product"
        >
          + Add Product
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin text-2xl">⏳</div>
          <span className="ml-2 text-gray-500 text-sm">Loading products…</span>
        </div>
      )}

      {/* Load error */}
      {!loading && loadError && (
        <div className="text-center py-10">
          <p className="text-red-500 text-sm">{loadError}</p>
          <button
            type="button"
            onClick={loadProducts}
            className="mt-3 text-[#F47216] text-sm font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !loadError && products.length === 0 && (
        <div className="text-center py-14">
          <div className="text-5xl mb-3">🛒</div>
          <p className="text-gray-600 font-semibold">No products yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Add your first product to start selling.
          </p>
          <button
            type="button"
            onClick={openAddForm}
            className="mt-4 text-white text-sm font-bold px-5 py-2.5 rounded-xl"
            style={{ backgroundColor: "#F47216" }}
          >
            + Add Product
          </button>
        </div>
      )}

      {/* Product list */}
      {!loading && products.length > 0 && (
        <div className="space-y-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={() => openEditForm(p)}
              onDelete={() => requestDelete(p)}
              isOptimistic={optimisticIds.has(p.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <ProductFormModal
          mode={formMode}
          initial={editTarget ? productToFormData(editTarget) : defaultForm()}
          onSubmit={handleFormSubmit}
          onClose={closeForm}
          submitting={submitting}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          productTitle={deleteTarget.title}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
