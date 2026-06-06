/**
 * medusa-backend/src/types/platform.ts
 *
 * Backend-side TypeScript types for the Digital Rohtak Core Platform.
 * These are parallel to the storefront types in storefront/lib/types/platform.ts
 * and MUST NOT be imported from there — they are intentionally duplicated to
 * keep the backend free of storefront dependencies.
 *
 * Requirements: all
 */

// ---------------------------------------------------------------------------
// Delivery Lifecycle Enums
// Parallel to DELIVERY_LIFECYCLE_STATUSES in modules/delivery/models/delivery-order.ts
// but kept here so API handlers can import a single types file.
// ---------------------------------------------------------------------------

/** All valid values for DeliveryOrder.lifecycle_status (Requirements 8.1–8.4). */
export const DELIVERY_LIFECYCLE_STATUSES = [
  "broadcast",        // DeliveryOrder created; sent to online Riders in zone
  "assigned",         // A Rider has accepted the order
  "ready_for_pickup", // Seller has marked the order ready for pickup
  "picked_up",        // Rider has confirmed pickup from Seller
  "delivered",        // Rider has confirmed delivery to Customer
  "complete",         // Final reconciliation done
  "unassigned",       // No Rider accepted after 3 re-broadcasts
  "expired",          // Order timed out (no UTR within 15 min)
] as const;

export type DeliveryLifecycleStatus = typeof DELIVERY_LIFECYCLE_STATUSES[number];

/**
 * Statuses that represent an in-progress delivery (Rider assigned and moving).
 * Used to guard against double-broadcasts while a Rider is active.
 */
export const ACTIVE_DELIVERY_STATUSES: DeliveryLifecycleStatus[] = [
  "assigned",
  "ready_for_pickup",
  "picked_up",
];

/**
 * Terminal lifecycle statuses — no further transitions are valid.
 */
export const TERMINAL_DELIVERY_STATUSES: DeliveryLifecycleStatus[] = [
  "delivered",
  "complete",
  "unassigned",
  "expired",
];

// ---------------------------------------------------------------------------
// UPI Status Enums
// Mirrors the utr_status enum on the UpiPayment model (Requirements 7.1–7.10).
// ---------------------------------------------------------------------------

/** All valid values for UpiPayment.utr_status. */
export const UTR_STATUSES = [
  "pending",       // Order placed; waiting for Customer to submit UTR
  "utr_submitted", // UTR received; deferred commit in progress
  "disbursed",     // Both P2P UPI disbursements completed successfully
  "expired",       // UTR not received within 15 min, or 3 failed attempts
] as const;

export type UtrStatus = typeof UTR_STATUSES[number];

// ---------------------------------------------------------------------------
// Request bodies — Delivery
// ---------------------------------------------------------------------------

/**
 * POST /store/delivery/accept
 * A Rider claims a broadcast DeliveryOrder.
 * Requirements: 5.3, 5.4, 5.5, 5.8, 8.2
 */
export interface AcceptOrderRequest {
  /** ID of the DeliveryOrder the Rider is accepting. */
  delivery_order_id: string;
  /** ID of the Driver record for the accepting Rider. */
  driver_id: string;
}

/**
 * PUT /store/delivery/driver/status
 * Rider toggles online / offline.
 * The "online" value maps to Driver.status = "available".
 * The "offline" value maps to Driver.status = "offline".
 * Requirements: 6.1
 */
export interface ToggleStatusRequest {
  status: "online" | "offline";
}

/**
 * POST /store/delivery/driver/register
 * First-time Rider registration.
 * Requirements: 4.1, 4.2, 4.3
 */
export interface RegisterDriverRequest {
  /** Full name, 1–100 characters. */
  name: string;
  /** Exactly 10 numeric digits. */
  phone: string;
  /** One of the supported vehicle categories. */
  vehicle_type: "Bicycle" | "Motorcycle" | "Car" | "Van";
  /** 1–20 alphanumeric characters. */
  vehicle_number: string;
}

/**
 * POST /store/delivery?action=update-location
 * Rider transmits GPS coordinates during an active delivery.
 * Requirements: 6.1, 6.7
 */
export interface UpdateLocationRequest {
  driver_id: string;
  lat: number;
  lng: number;
}

/**
 * POST /store/delivery?action=update-status
 * Rider confirms a pickup or delivery milestone.
 * Requirements: 6.3, 6.4, 8.3, 8.4
 */
export interface UpdateDeliveryStatusRequest {
  delivery_id: string;
  /** Only "picked_up" and "delivered" are valid from the Rider App. */
  status: "picked_up" | "delivered";
  lat?: number;
  lng?: number;
}

// ---------------------------------------------------------------------------
// Request bodies — UPI
// ---------------------------------------------------------------------------

/**
 * POST /store/payment/upi/disburse  (admin-scoped, internal)
 * Triggers two outbound P2P UPI disbursements after Rider acceptance.
 * VPA values are resolved server-side; they are NEVER exposed to the storefront.
 * Requirements: 7.4, 7.5, 7.8, 7.10
 */
export interface DisburseRequest {
  /** Medusa Order ID linked to the UpiPayment record. */
  order_id: string;
  /** Seller's UPI Virtual Payment Address (from MerchantConfig). */
  seller_vpa: string;
  /** Amount to disburse to the Seller, in INR paise. */
  seller_amount: number;
  /** Rider's UPI Virtual Payment Address (from Driver.upi_vpa). */
  rider_vpa: string;
  /** Amount to disburse to the Rider (delivery fee), in INR paise. */
  rider_amount: number;
}

/**
 * POST /store/payment/upi/submit-utr
 * Customer submits a UTR to confirm a UPI transfer.
 * Requirements: 7.3, 7.7
 */
export interface SubmitUtrRequest {
  cart_id: string;
  /** Must match /^[A-Za-z0-9]{12,23}$/. */
  utr: string;
}

// ---------------------------------------------------------------------------
// Request bodies — Seller Dashboard
// ---------------------------------------------------------------------------

/**
 * PUT /store/seller/orders/{id}/ready-for-pickup
 * Seller signals that the order is packed and ready for the Rider.
 * Requirements: 2.3, 2.4
 */
export interface ReadyForPickupRequest {
  /** Provided by URL param; repeated here for type-safe body parsing if needed. */
  order_id?: string;
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

/**
 * Consistent API error envelope returned by all new endpoints.
 * Requirements: 1.8, 2.7, 4.6, 4.7
 */
export interface ApiError {
  /** Human-readable English error message. */
  error: string;
  /** Machine-readable code, e.g. "PRODUCT_HAS_ACTIVE_ORDERS". */
  code?: string;
  /** For validation errors, the name of the offending field. */
  field?: string;
}

/**
 * 409 response body returned when a Rider tries to accept an order that
 * has already been claimed or has expired.
 * Requirements: 5.8, 8.8
 */
export interface AcceptConflictResponse {
  reason: "already_claimed" | "expired";
}

/**
 * Successful response from POST /store/delivery/accept.
 * Requirements: 5.3, 8.2
 */
export interface AcceptOrderResponse {
  assigned: true;
  delivery_order: {
    id: string;
    lifecycle_status: DeliveryLifecycleStatus;
    pickup_address: string;
    dropoff_address: string;
    delivery_fee: number | null;
  };
}

/**
 * SSE event payload pushed to online Riders via
 * GET /store/delivery/broadcast/stream.
 * Requirements: 5.1, 5.2
 */
export interface BroadcastEvent {
  type: "new_order";
  delivery_order_id: string;
  store_name: string;
  pickup_address: string;
  estimated_distance_km: number;
  /** Delivery fee in INR paise. */
  delivery_fee: number;
}

/**
 * Single line item in a Rider's earnings history.
 * Requirements: 10.2, 10.3
 */
export interface RiderEarningsItem {
  delivery_order_id: string;
  /** ISO 8601 timestamp of delivery completion. */
  completion_date: string;
  /** Delivery fee earned, in INR paise. */
  delivery_fee: number;
}

/**
 * Full response from GET /store/delivery/rider/earnings.
 * Requirements: 10.1, 10.2, 10.4, 10.5
 */
export interface RiderEarningsResponse {
  /** Sum of all delivery fees, in INR paise. */
  total: number;
  currency: "INR";
  items: RiderEarningsItem[];
}

/**
 * Single line item in a Seller's earnings history.
 * Requirements: 3.2, 3.3
 */
export interface SellerEarningsItem {
  order_id: string;
  /** ISO 8601 timestamp of order completion. */
  completion_date: string;
  /** Order subtotal, in INR paise. */
  subtotal: number;
}

/**
 * Full response from GET /store/seller/earnings.
 * Requirements: 3.1, 3.2, 3.4, 3.5
 */
export interface SellerEarningsResponse {
  /** Sum of all order subtotals, in INR paise. */
  total: number;
  currency: "INR";
  items: SellerEarningsItem[];
}

/**
 * Safe subset of the Rider's location included in tracking responses.
 * Name and phone are explicitly omitted to protect Rider privacy.
 * Requirements: 9.3, 9.6, 9.8
 */
export interface SafeDriverLocation {
  lat: number;
  lng: number;
  /** Unix timestamp (ms) of the last GPS update. */
  ts: number;
}
