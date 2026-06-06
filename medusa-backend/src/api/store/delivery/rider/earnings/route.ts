import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { DELIVERY_MODULE } from "../../../../../modules/delivery";
import { resolveCustomerFromToken } from "../../../../../lib/auth";
import type { RiderEarningsResponse, RiderEarningsItem } from "../../../../../types/platform";

/**
 * GET /store/delivery/rider/earnings?from={date}&to={date}
 *
 * Returns the authenticated Rider's earnings summary from all "delivered"
 * DeliveryOrders assigned to their Driver record.
 *
 * Query parameters:
 *   from  string (optional) — ISO 8601 date, inclusive lower bound
 *   to    string (optional) — ISO 8601 date, inclusive upper bound
 *
 * Responses:
 *   200 — RiderEarningsResponse { total, currency: "INR", items }
 *   401 — Not authenticated
 *   404 — No Driver record found for the authenticated user
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = await resolveCustomerFromToken(req);
  if (!customerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const deliveryService = req.scope.resolve(DELIVERY_MODULE);

  // Resolve Driver record by user_id
  const drivers = await deliveryService.listDrivers({ user_id: [customerId] });
  if (drivers.length === 0) {
    return res.status(404).json({ error: "No Driver record found for this user" });
  }

  const driver = drivers[0];

  // Fetch all "delivered" DeliveryOrders assigned to this driver
  const allDelivered = await deliveryService.listDeliveryOrders({
    driver_id: [driver.id],
    lifecycle_status: ["delivered"],
  });

  // Apply optional date-range filter (inclusive on both ends)
  const { from, to } = req.query as { from?: string; to?: string };

  let filtered = allDelivered;

  if (from) {
    const fromDate = new Date(from);
    // Set to start of day
    fromDate.setHours(0, 0, 0, 0);
    filtered = filtered.filter((order: any) => {
      const completedAt = order.completed_at ? new Date(order.completed_at) : null;
      return completedAt && completedAt >= fromDate;
    });
  }

  if (to) {
    const toDate = new Date(to);
    // Set to end of day for inclusive upper bound
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter((order: any) => {
      const completedAt = order.completed_at ? new Date(order.completed_at) : null;
      return completedAt && completedAt <= toDate;
    });
  }

  // Sort by completion date descending (Requirement 10.2)
  filtered.sort((a: any, b: any) => {
    const aDate = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    const bDate = b.completed_at ? new Date(b.completed_at).getTime() : 0;
    return bDate - aDate;
  });

  // Build earnings items
  const items: RiderEarningsItem[] = filtered.map((order: any) => ({
    delivery_order_id: order.id,
    completion_date: order.completed_at
      ? new Date(order.completed_at).toISOString()
      : new Date(order.updated_at || order.created_at).toISOString(),
    // delivery_fee is stored in INR paise (float); default 0 if not set
    delivery_fee: typeof order.delivery_fee === "number" ? order.delivery_fee : 0,
  }));

  // Sum delivery fees (Requirement 10.1, 10.4)
  const total = items.reduce((sum, item) => sum + item.delivery_fee, 0);

  const response: RiderEarningsResponse = {
    total,
    currency: "INR",
    items,
  };

  return res.json(response);
}
