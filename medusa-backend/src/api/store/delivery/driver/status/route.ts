import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { DELIVERY_MODULE } from "../../../../../modules/delivery";
import { resolveCustomerFromToken } from "../../../../../lib/auth";

/**
 * PUT /store/delivery/driver/status
 *
 * Toggles the authenticated Rider's Driver record between online and offline.
 *
 * Request body:
 *   status  "online" | "offline"
 *
 * Mapping:
 *   "online"  → Driver.status = "available"
 *   "offline" → Driver.status = "offline"
 *
 * Responses:
 *   200 — Status updated
 *   400 — Invalid status value
 *   401 — Not authenticated
 *   403 — Caller does not own the Driver record
 *   404 — No Driver record found for the caller
 *
 * Requirements: 6.1
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  // Resolve customer from JWT
  const customerId = await resolveCustomerFromToken(req);
  if (!customerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { status } = req.body as { status?: string };

  if (!status || !["online", "offline"].includes(status)) {
    return res.status(400).json({
      error: "status must be 'online' or 'offline'",
      field: "status",
    });
  }

  const deliveryService = req.scope.resolve(DELIVERY_MODULE);

  // Find Driver record owned by this customer
  const drivers = await deliveryService.listDrivers({ user_id: [customerId] });
  if (drivers.length === 0) {
    return res.status(404).json({ error: "No Driver record found for this user" });
  }

  const driver = drivers[0];

  // Enforce caller owns the Driver record
  if (driver.user_id !== customerId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Map "online" → "available", "offline" → "offline"
  const driverStatus = status === "online" ? "available" : "offline";

  await deliveryService.updateDrivers([{
    id: driver.id,
    status: driverStatus,
  }]);

  return res.json({
    driver_id: driver.id,
    status: driverStatus,
    display_status: status,
  });
}
