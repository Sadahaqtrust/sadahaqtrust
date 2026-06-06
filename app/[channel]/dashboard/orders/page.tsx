"use client";
/**
 * OrderManager — Seller Dashboard: Order Management
 *
 * Polls GET /store/seller/orders?channel={handle} every 8 seconds.
 * Tracks last_seen_order_id to show an unread badge on new orders.
 * Renders order list with: order ID, placed time, customer name,
 * total (formatINR), status label.
 *
 * ORDER_CONTROLS mapping:
 *   pending            → "Mark Ready for Pickup" + "View Details"
 *   ready_for_pickup   → "View Details" only
 *   assigned/picked_up/delivered/complete → read-only status label + "View Details"
 *
 * On "Mark Ready for Pickup": PUT /store/seller/orders/{id}/ready-for-pickup
 *   - success: show confirmation
 *   - error: show error toast, retain previous status
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getStoredToken } from "@/lib/authCookies";
import { formatINR } from "@/lib/utils/currency";
import type { SellerOrderRow, DeliveryLifecycleStatus } from "@/lib/types/platform";

// ── Constants ──────────────────────────────────────────────────────────────
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

const POLL_INTERVAL_MS = 8_000;

// ── ORDER_CONTROLS status → action mapping ─────────────────────────────────

interface ControlSet {
  primaryAction: "mark_ready" | null;
  secondaryAction: "view_details";
  readOnlyLabel: string | null;
}

const ORDER_CONTROLS: Record<string, ControlSet> = {
  pending: {
    primaryAction: "mark_ready",
    secondaryAction: "view_details",
    readOnlyLabel: null,
  },
  ready_for_pickup: {
    primaryAction: null,
    secondaryAction: "view_details",
    readOnlyLabel: null,
  },
  assigned: {
    primaryAction: null,
    secondaryAction: "view_details",
    readOnlyLabel: "Rider Assigned",
  },
  picked_up: {
    primaryAction: null,
    secondaryAction: "view_details",
    readOnlyLabel: "Out for Delivery",
  },
  delivered: {
    primaryAction: null,
    secondaryAction: "view_details",
    readOnlyLabel: "Delivered",
  },
  complete: {
    primaryAction: null,
    secondaryAction: "view_details",
    readOnlyLabel: "Complete",
  },
  broadcast: {
    primaryAction: null,
    secondaryAction: "view_details",
    readOnlyLabel: "Finding Rider",
  },
  unassigned: {
    primaryAction: null,
    secondaryAction: "view_details",
    readOnlyLabel: "No Rider Available",
  },
};

function getControls(status: string): ControlSet {
  return (
    ORDER_CONTROLS[status] ?? {
      primaryAction: null,
      secondaryAction: "view_details",
      readOnlyLabel: status,
    }
  );
}

// ── API helpers ────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    "x-publishable-api-key": PUB_KEY,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchOrders(channel: string): Promise<SellerOrderRow[]> {
  const token = getStoredToken();
  const res = await fetch(
    `${MEDUSA_URL}/store/seller/orders?channel=${encodeURIComponent(channel)}&page=1&limit=50`,
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
  const orders: SellerOrderRow[] = data.orders ?? data;
  // Sort by created_at descending (in case server doesn't guarantee order)
  return orders.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

async function markOrderReady(orderId: string): Promise<void> {
  const res = await fetch(
    `${MEDUSA_URL}/store/seller/orders/${orderId}/ready-for-pickup`,
    {
      method: "PUT",
      headers: authHeaders(),
    }
  );
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error((b as any).error || `HTTP ${res.status}`);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatPlacedTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

function shortOrderId(orderId: string): string {
  // Show last 8 chars of order ID for readability
  return orderId.length > 8 ? `…${orderId.slice(-8)}` : orderId;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "error" | "success";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
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

// ── Order Detail Modal ──────────────────────────────────────────────────────

interface OrderDetailModalProps {
  order: SellerOrderRow;
  onClose: () => void;
}

function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  const controls = getControls(order.lifecycle_status);
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-2"
      role="dialog"
      aria-modal="true"
      aria-label="Order details"
    >
      <div className="bg-white rounded-2xl w-full max-w-[480px] shadow-2xl">
        <div
          className="px-5 py-4 rounded-t-2xl flex items-center justify-between"
          style={{ backgroundColor: "#F47216" }}
        >
          <h2 className="text-white font-bold text-base">Order Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl font-bold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Order ID</span>
            <span className="font-mono text-xs text-gray-800 break-all text-right max-w-[60%]">
              {order.order_id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Customer</span>
            <span className="font-semibold text-gray-800">{order.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Placed</span>
            <span className="text-gray-700">{formatPlacedTime(order.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total</span>
            <span className="font-bold text-[#F47216]">{formatINR(order.total)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Status</span>
            <StatusBadge status={order.lifecycle_status} />
          </div>
          {controls.readOnlyLabel && (
            <div className="flex justify-between">
              <span className="text-gray-500">Stage</span>
              <span className="text-gray-700 font-medium">{controls.readOnlyLabel}</span>
            </div>
          )}
        </div>
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────────

const STATUS_COLOURS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  ready_for_pickup: "bg-blue-100 text-blue-800",
  assigned: "bg-indigo-100 text-indigo-800",
  broadcast: "bg-purple-100 text-purple-800",
  picked_up: "bg-orange-100 text-orange-800",
  delivered: "bg-teal-100 text-teal-800",
  complete: "bg-green-100 text-green-800",
  unassigned: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  ready_for_pickup: "Ready for Pickup",
  assigned: "Rider Assigned",
  broadcast: "Finding Rider",
  picked_up: "Out for Delivery",
  delivered: "Delivered",
  complete: "Complete",
  unassigned: "No Rider",
};

function StatusBadge({ status }: { status: string }) {
  const colours = STATUS_COLOURS[status] ?? "bg-gray-100 text-gray-600";
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${colours}`}>
      {label}
    </span>
  );
}

// ── Order Row ────────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: SellerOrderRow;
  isNew: boolean;
  onMarkReady: (id: string) => void;
  onViewDetails: (order: SellerOrderRow) => void;
  isUpdating: boolean;
  successId: string | null;
}

function OrderRowCard({
  order,
  isNew,
  onMarkReady,
  onViewDetails,
  isUpdating,
  successId,
}: OrderRowProps) {
  const controls = getControls(order.lifecycle_status);
  const justUpdated = successId === order.order_id;

  return (
    <div
      className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${
        isNew ? "border-[#F47216] ring-1 ring-[#F47216]/30" : "border-gray-200"
      } ${justUpdated ? "bg-green-50 border-green-300" : ""}`}
    >
      {/* Top row: order ID + new badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-gray-500 truncate">
            #{shortOrderId(order.order_id)}
          </span>
          {isNew && (
            <span className="text-xs bg-[#F47216] text-white font-bold px-2 py-0.5 rounded-full shrink-0">
              New
            </span>
          )}
        </div>
        <StatusBadge status={order.lifecycle_status} />
      </div>

      {/* Customer + time */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-800 truncate">
          {order.customer_name}
        </span>
        <span className="text-xs text-gray-400 shrink-0 ml-2">
          {formatPlacedTime(order.created_at)}
        </span>
      </div>

      {/* Total */}
      <div className="mb-3">
        <span className="text-[#F47216] font-bold text-sm">
          {formatINR(order.total)}
        </span>
      </div>

      {/* Success confirmation */}
      {justUpdated && (
        <div className="mb-2 text-xs font-semibold text-green-700 bg-green-100 rounded-lg px-3 py-1.5">
          ✓ Marked as Ready for Pickup
        </div>
      )}

      {/* Action controls */}
      {controls.readOnlyLabel ? (
        // Read-only status + View Details
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500 font-medium">
            {controls.readOnlyLabel}
          </span>
          <button
            type="button"
            onClick={() => onViewDetails(order)}
            className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-50"
          >
            View Details
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          {controls.primaryAction === "mark_ready" && (
            <button
              type="button"
              onClick={() => onMarkReady(order.order_id)}
              disabled={isUpdating}
              className="flex-1 text-xs text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#F47216" }}
              aria-label={`Mark order ${shortOrderId(order.order_id)} as ready for pickup`}
            >
              {isUpdating ? "Updating…" : "Mark Ready for Pickup"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onViewDetails(order)}
            className="text-xs px-3 py-2 border border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 shrink-0"
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface OrderManagerProps {
  params: { channel: string };
}

export default function OrderManagerPage({ params }: OrderManagerProps) {
  const { channel } = params;

  const [orders, setOrders] = useState<SellerOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Unread tracking
  const lastSeenOrderId = useRef<string | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  // Update state
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  // Details modal
  const [viewingOrder, setViewingOrder] = useState<SellerOrderRow | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  function showToast(message: string, type: "error" | "success" = "error") {
    setToast({ message, type });
  }

  // ── Polling ───────────────────────────────────────────────────────────────
  const loadOrders = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchOrders(channel);

        setOrders((prev) => {
          const prevIds = new Set(prev.map((o) => o.order_id));
          const topId = data[0]?.order_id ?? null;

          if (isInitial) {
            // On first load, set the baseline
            lastSeenOrderId.current = topId;
            setNewOrderIds(new Set());
            setUnreadCount(0);
          } else if (lastSeenOrderId.current !== null && topId !== lastSeenOrderId.current) {
            // New orders appeared at the top
            const newIds = new Set<string>();
            for (const order of data) {
              if (order.order_id === lastSeenOrderId.current) break;
              newIds.add(order.order_id);
            }
            setNewOrderIds((existing) => new Set(Array.from(existing).concat(Array.from(newIds))));
            setUnreadCount((c) => c + newIds.size);
            lastSeenOrderId.current = topId;
          }

          return data;
        });
      } catch (err: any) {
        if (isInitial) {
          setLoadError(err.message || "Failed to load orders.");
        }
        // Silently ignore polling errors after initial load
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [channel]
  );

  useEffect(() => {
    loadOrders(true);
    const interval = setInterval(() => loadOrders(false), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Clear unread count when user opens the orders tab
  function clearUnread() {
    setNewOrderIds(new Set());
    setUnreadCount(0);
  }

  // ── Mark Ready for Pickup ─────────────────────────────────────────────────
  async function handleMarkReady(orderId: string) {
    setUpdatingOrderId(orderId);
    try {
      await markOrderReady(orderId);
      // Update order status locally
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId
            ? { ...o, lifecycle_status: "ready_for_pickup" as DeliveryLifecycleStatus }
            : o
        )
      );
      setSuccessOrderId(orderId);
      // Clear success indicator after 3s
      setTimeout(() => setSuccessOrderId(null), 3000);
    } catch (err: any) {
      showToast(err.message || "Failed to update order status. Please try again.");
      // Status is retained (no local update on error)
    } finally {
      setUpdatingOrderId(null);
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

      {/* Header with unread badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-800">Orders</h2>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={clearUnread}
              className="flex items-center gap-1 text-xs bg-[#F47216] text-white font-bold px-2.5 py-1 rounded-full"
              aria-label={`${unreadCount} new order${unreadCount !== 1 ? "s" : ""}, click to dismiss`}
            >
              {unreadCount} new
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => loadOrders(true)}
          className="text-xs text-[#F47216] font-semibold hover:underline"
          aria-label="Refresh orders"
        >
          ↺ Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin text-2xl">⏳</div>
          <span className="ml-2 text-gray-500 text-sm">Loading orders…</span>
        </div>
      )}

      {/* Load error */}
      {!loading && loadError && (
        <div className="text-center py-10">
          <p className="text-red-500 text-sm">{loadError}</p>
          <button
            type="button"
            onClick={() => loadOrders(true)}
            className="mt-3 text-[#F47216] text-sm font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !loadError && orders.length === 0 && (
        <div className="text-center py-14">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-gray-600 font-semibold">No orders yet</p>
          <p className="text-gray-400 text-sm mt-1">
            New orders will appear here automatically.
          </p>
        </div>
      )}

      {/* Order list */}
      {!loading && orders.length > 0 && (
        <div className="space-y-3" onClick={clearUnread}>
          {orders.map((order) => (
            <OrderRowCard
              key={order.order_id}
              order={order}
              isNew={newOrderIds.has(order.order_id)}
              onMarkReady={handleMarkReady}
              onViewDetails={(o) => setViewingOrder(o)}
              isUpdating={updatingOrderId === order.order_id}
              successId={successOrderId}
            />
          ))}
        </div>
      )}

      {/* Order detail modal */}
      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
        />
      )}
    </div>
  );
}
