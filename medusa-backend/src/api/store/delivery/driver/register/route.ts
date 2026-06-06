import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { DELIVERY_MODULE } from "../../../../../modules/delivery";
import { resolveCustomerFromToken } from "../../../../../lib/auth";

/**
 * POST /store/delivery/driver/register
 *
 * Creates a new Driver record for the authenticated Rider.
 *
 * Request body:
 *   name          string  — 1–100 characters
 *   phone         string  — exactly 10 numeric digits (/^\d{10}$/)
 *   vehicle_type  enum    — "Bicycle" | "Motorcycle" | "Car" | "Van"
 *   vehicle_number string — 1–20 alphanumeric (/^[A-Za-z0-9]{1,20}$/)
 *
 * Responses:
 *   201 — Driver created successfully
 *   400 — Validation failure with per-field errors
 *   401 — Not authenticated
 *   409 — A Driver record already exists for this user_id
 *
 * Requirements: 4.1, 4.2, 4.3, 4.6
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Resolve customer from JWT
  const customerId = await resolveCustomerFromToken(req);
  if (!customerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { name, phone, vehicle_type, vehicle_number } = req.body as Record<string, string>;

  // Per-field validation
  const errors: Record<string, string> = {};

  if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100) {
    errors.name = "Name must be between 1 and 100 characters";
  }

  if (!phone || typeof phone !== "string" || !/^\d{10}$/.test(phone)) {
    errors.phone = "Phone must be exactly 10 numeric digits";
  }

  const validVehicleTypes = ["Bicycle", "Motorcycle", "Car", "Van"];
  if (!vehicle_type || !validVehicleTypes.includes(vehicle_type)) {
    errors.vehicle_type = "vehicle_type must be one of: Bicycle, Motorcycle, Car, Van";
  }

  if (!vehicle_number || typeof vehicle_number !== "string" || !/^[A-Za-z0-9]{1,20}$/.test(vehicle_number)) {
    errors.vehicle_number = "vehicle_number must be 1–20 alphanumeric characters";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: "Validation failed", fields: errors });
  }

  const deliveryService = req.scope.resolve(DELIVERY_MODULE);

  // Check for duplicate Driver by user_id (Requirement 4.6 → 409)
  const existing = await deliveryService.listDrivers({ user_id: [customerId] });
  if (existing.length > 0) {
    return res.status(409).json({ error: "A Driver record already exists for this user", code: "DRIVER_ALREADY_EXISTS" });
  }

  // Resolve default ServiceZone (city-level zone for Rohtak)
  let zone_id: string | null = null;
  try {
    const zones = await deliveryService.listServiceZones({ is_active: [true] });
    // Pick first active zone as the default city-level zone
    if (zones.length > 0) {
      zone_id = zones[0].id;
    }
  } catch {
    // Zone resolution is best-effort — proceed without it
  }

  // Map vehicle_type from spec values to model enum values
  const vehicleTypeMap: Record<string, "bike" | "scooter" | "car" | "van"> = {
    Bicycle: "bike",
    Motorcycle: "bike",
    Car: "car",
    Van: "van",
  };

  const driver = await deliveryService.createDrivers([{
    name: name.trim(),
    phone,
    vehicle_type: vehicleTypeMap[vehicle_type] || "bike",
    vehicle_number,
    user_id: customerId,
    zone_id,
    status: "offline" as const,
    // Store the original vehicle_type value in metadata for display
    metadata: { vehicle_type_display: vehicle_type },
  }]);

  return res.status(201).json({ driver: driver[0] });
}
