/**
 * Storefront-side shared TypeScript types for the Digital Rohtak Core Platform.
 * See .kiro/specs/digital-rohtak-core-platform/design.md §Components and Interfaces.
 *
 * These types cover all request/response shapes used by the Seller Dashboard,
 * Rider App, UPI payment flow, Order Lifecycle, and Customer Tracking features.
 *
 * NOTE: Types are NOT shared across the monorepo boundary. The parallel backend
 * types live in `medusa-backend/src/types/platform.ts`.
 */

// ---------------------------------------------------------------------------
// Enums / Union types
// ---------------------------------------------------------------------------

/**
 * Lifecycle statuses for a DeliveryOrder.
 * Maps to the `lifecycle_status` column added in Group 1 migrations.
 */
export type DeliveryLifecycleStatus =
  | "broadcast"
  | "assigned"
  | "ready_for_pickup"
  | "picked_up"
  | "delivered"
  | "complete"
  | "unassigned"
  | "expired";

/**
 * Status of the UPI deferred-commit payment.
 * Maps to the `utr_status` column added in Group 1 migrations.
 */
export type UtrStatus =
  | "pending"
  | "utr_submitted"
  | "disbursed"
  | "expired";

/** Vehicle types supported by the Rider registration form. */
export type VehicleType = "Bicycle" | "Motorcycle" | "Car" | "Van";

/** Platform roles assigned to every authenticated user account (exactly one). */
export type UserRole = "customer" | "seller" | "rider";

/**
 * Driver online/offline status.
 * "available" is the internal Medusa value for "online".
 */
export type DriverStatus = "available" | "offline" | "busy";

/** Medusa Order status values relevant to the order lifecycle. */
export type OrderStatus = "pending" | "in_progress" | "completed" | "cancelled";

// ---------------------------------------------------------------------------
// Error shape
// ---------------------------------------------------------------------------

/**
 * Consistent error response returned by all new platform API endpoints.
 * Used both for network errors and domain errors (validation, auth, etc.).
 */
export interface ApiError {
  /** Human-readable English error message. */
  error: string;
  /**
   * Machine-readable error code, e.g. "PRODUCT_HAS_ACTIVE_ORDERS".
   * Optional — only present for known domain errors.
   */
  code?: string;
  /**
   * Field name when the error is field-level validation feedback.
   * Optional — only present for validation errors.
   */
  field?: string;
}

// ---------------------------------------------------------------------------
// Rider App — Registration
// ---------------------------------------------------------------------------

/**
 * Request body for `POST /store/delivery/driver/register`.
 * All fields are validated client-side before the request is sent.
 */
export interface RegisterDriverRequest {
  /** Rider's full name. 1–100 characters. */
  name: string;
  /** 10 numeric digits. Must match `/^\d{10}$/`. */
  phone: string;
  /** Type of vehicle the Rider uses. */
  vehicle_type: VehicleType;
  /** Registration plate / vehicle number. 1–20 alphanumeric characters. Must match `/^[A-Za-z0-9]{1,20}$/`. */
  vehicle_number: string;
}

// ---------------------------------------------------------------------------
// Rider App — Status Toggle
// ---------------------------------------------------------------------------

/**
 * Request body for `PUT /store/delivery/driver/status`.
 * Maps "online" → Driver.status = "available" and "offline" → "offline".
 */
export interface ToggleStatusRequest {
  status: "online" | "offline";
}

// ---------------------------------------------------------------------------
// Rider App — Broadcast
// ---------------------------------------------------------------------------

/**
 * Server-Sent Event payload pushed by `GET /store/delivery/broadcast/stream`.
 * Contains all information needed to render the incoming-order card.
 */
export interface BroadcastEvent {
  /** Always "new_order" for delivery broadcast events. */
  type: "new_order";
  /** ID of the DeliveryOrder being broadcast. */
  delivery_order_id: string;
  /** Display name of the store / seller. */
  store_name: string;
  /** Human-readable pickup address. */
  pickup_address: string;
  /** Estimated straight-line distance from Rider to pickup, in kilometres. */
  estimated_distance_km: number;
  /** Delivery fee in paise (divide by 100 for INR display). */
  delivery_fee: number;
}

// ---------------------------------------------------------------------------
// Rider App — Accept Order
// ---------------------------------------------------------------------------

/**
 * Request body for `POST /store/delivery/accept`.
 * A PostgreSQL advisory lock on `delivery_order_id` prevents double-assignment.
 */
export interface AcceptOrderRequest {
  delivery_order_id: string;
  driver_id: string;
}

/**
 * Successful response from `POST /store/delivery/accept`.
 */
export interface AcceptOrderResponse {
  assigned: true;
  delivery_order: DeliveryOrderSummary;
}

/**
 * 409 response when the order was already claimed or has expired.
 */
export interface AcceptOrderConflict {
  reason: "already_claimed" | "expired";
}

// ---------------------------------------------------------------------------
// Rider App — Location Update
// ---------------------------------------------------------------------------

/**
 * Request body for `POST /store/delivery?action=update-location`.
 * Coordinates are written to Redis `driver:loc:{driverId}` (TTL 300 s).
 */
export interface UpdateLocationRequest {
  driver_id: string;
  lat: number;
  lng: number;
}

// ---------------------------------------------------------------------------
// Rider App — Status Update (pickup / delivery confirmation)
// ---------------------------------------------------------------------------

/**
 * Request body for `POST /store/delivery?action=update-status`.
 */
export interface UpdateDeliveryStatusRequest {
  delivery_id: string;
  status: "picked_up" | "delivered";
  lat: number | null;
  lng: number | null;
}

// ---------------------------------------------------------------------------
// Rider App — Earnings
// ---------------------------------------------------------------------------

/**
 * Single line item in the Rider's earnings list.
 */
export interface RiderEarningsItem {
  /** ID of the completed DeliveryOrder. */
  delivery_order_id: string;
  /** ISO 8601 completion date string. */
  completion_date: string;
  /** Delivery fee in paise. */
  delivery_fee: number;
}

/**
 * Full response from `GET /store/delivery/rider/earnings`.
 */
export interface RiderEarningsResponse {
  /** Sum of all delivery fees in paise. */
  total: number;
  /** Currency is always INR. */
  currency: "INR";
  items: RiderEarningsItem[];
}

// ---------------------------------------------------------------------------
// Seller Dashboard — Product types
// ---------------------------------------------------------------------------

/** A product variant, as used in the Seller Dashboard product form. */
export interface ProductVariant {
  id?: string;
  title: string;
  price: number; // paise
  sku?: string;
}

/** A product as returned by the Seller Dashboard API. */
export interface SellerProduct {
  id: string;
  title: string;
  description: string;
  variants: ProductVariant[];
  status: "active" | "inactive";
}

/**
 * Request body for `POST /store/seller/products` and
 * `PUT /store/seller/products/{id}`.
 */
export interface ProductUpsertRequest {
  /** 1–255 characters. */
  title: string;
  /** 1–5000 characters. */
  description: string;
  /** Price in paise, must be > 0. */
  price: number;
  /** At least one variant required. */
  variants: ProductVariant[];
}

// ---------------------------------------------------------------------------
// Seller Dashboard — Order types
// ---------------------------------------------------------------------------

/** Order row as returned by `GET /store/seller/orders`. */
export interface SellerOrderRow {
  order_id: string;
  created_at: string; // ISO 8601
  customer_name: string;
  total: number; // paise
  lifecycle_status: DeliveryLifecycleStatus;
}

/** Paginated response from `GET /store/seller/orders`. */
export interface SellerOrderListResponse {
  orders: SellerOrderRow[];
  /** Total count of orders matching the query (for pagination UI). */
  count: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Seller Dashboard — Earnings
// ---------------------------------------------------------------------------

/**
 * Single line item in the Seller's earnings list.
 * Also referenced in the design document's `EarningsItem` shape.
 */
export interface EarningsItem {
  /** Medusa Order ID. */
  order_id: string;
  /** ISO 8601 completion date. */
  completion_date: string;
  /** Order subtotal in paise. */
  subtotal: number;
}

/**
 * Full response from `GET /store/seller/earnings`.
 */
export interface SellerEarningsResponse {
  /** Sum of all order subtotals in paise. */
  total: number;
  /** Currency is always INR. */
  currency: "INR";
  items: EarningsItem[];
}

// ---------------------------------------------------------------------------
// Customer Order Tracking
// ---------------------------------------------------------------------------

/** Safe driver location — excludes personal details (name, phone). */
export interface SafeDriverLocation {
  lat: number;
  lng: number;
  /** Unix timestamp (ms) of the GPS reading. */
  ts: number;
}

/** A single event in the order's tracking timeline. */
export interface TrackingEventRecord {
  id: string;
  delivery_order_id: string;
  /** Status value at the time of this event. */
  status: string;
  created_at: string; // ISO 8601
  lat: number | null;
  lng: number | null;
}

/**
 * Response from `GET /store/delivery?action=track&tracking={number}`.
 * Driver name and phone are intentionally omitted.
 */
export interface OrderTrackingResponse {
  tracking_number: string;
  lifecycle_status: DeliveryLifecycleStatus | null;
  /** UpiPayment status, used to derive "Payment Pending" label before a DeliveryOrder exists. */
  utr_status: UtrStatus | null;
  events: TrackingEventRecord[];
  /**
   * Current driver GPS location. `null` when no Rider is assigned or
   * lifecycle_status is not in {assigned, picked_up}.
   */
  driver_location: SafeDriverLocation | null;
}

/**
 * Bilingual human-readable label for a delivery lifecycle status.
 * Used by the Customer `/track` page STATUS_LABELS mapping.
 */
export interface StatusLabel {
  en: string;
  hi: string;
}

// ---------------------------------------------------------------------------
// Delivery Order summary (storefront-safe)
// ---------------------------------------------------------------------------

/**
 * Storefront-safe summary of a DeliveryOrder.
 * Excludes VPA fields and other sensitive driver details.
 */
export interface DeliveryOrderSummary {
  id: string;
  lifecycle_status: DeliveryLifecycleStatus;
  pickup_address: string;
  dropoff_address: string;
  delivery_fee: number; // paise
  seller_channel_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Role-based middleware helpers
// ---------------------------------------------------------------------------

/**
 * A single role-enforcement rule used by `storefront/middleware.ts`.
 */
export interface RoleRule {
  pattern: RegExp;
  allowedRoles: UserRole[];
  /** Where to redirect each role that is NOT in `allowedRoles`. */
  redirectMap: Record<UserRole, string>;
}

// ---------------------------------------------------------------------------
// Status label mapping (type-level contract)
// ---------------------------------------------------------------------------

/**
 * Record mapping every DeliveryLifecycleStatus (and synthetic pre-lifecycle
 * states) to a bilingual label.
 */
export type StatusLabelMap = Record<string, StatusLabel>;
