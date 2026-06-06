import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { DELIVERY_MODULE } from "../../../modules/delivery";
import { resolveCustomerFromToken } from "../../../lib/auth";
import { appendTrackingEvent } from "../../../lib/tracking";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { action, tracking, lat, lng, order_total, date } = req.query as Record<string, string>;
  const deliveryService = req.scope.resolve(DELIVERY_MODULE);

  // GET /store/delivery?action=my-driver
  // Returns the Driver record for the authenticated customer (Requirement 4.1, 4.2)
  if (action === "my-driver") {
    const customerId = await resolveCustomerFromToken(req);
    if (!customerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const drivers = await deliveryService.listDrivers({ user_id: [customerId] });
    if (drivers.length === 0) {
      // 204 No Content — Driver record not yet created
      return res.status(204).end();
    }
    return res.json({ driver: drivers[0] });
  }

  // GET /store/delivery?action=track&tracking=DR123
  if (action === "track" && tracking) {
    const info = await deliveryService.getTrackingInfo(tracking);
    if (!info) return res.status(404).json({ error: "Tracking number not found" });

    // Strip driver personal details for privacy (Requirements 9.3, 9.6, 9.8)
    const safeInfo = { ...info };
    if (safeInfo.delivery && safeInfo.delivery.driver_id) {
      const driverLoc = await deliveryService.getDriverLocation(safeInfo.delivery.driver_id);
      safeInfo.driver_location = driverLoc
        ? { lat: driverLoc.lat, lng: driverLoc.lng }
        : null;
    }
    // Remove full driver object if present — never expose name/phone
    delete safeInfo.driver;

    return res.json(safeInfo);
  }

  // GET /store/delivery?action=slots&date=2026-05-05
  if (action === "slots") {
    const slots = await deliveryService.getAvailableTimeSlots(date);
    return res.json({ slots });
  }

  // GET /store/delivery?action=charge&lat=28.89&lng=76.60&order_total=500
  if (action === "charge" && lat && lng) {
    const result = await deliveryService.getDeliveryCharge(
      parseFloat(lat), parseFloat(lng), parseFloat(order_total || "0")
    );
    return res.json(result);
  }

  // GET /store/delivery?action=options
  if (action === "options") {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timeSlots: Array<{ label: string; value: string }> = [];
    if (now.getHours() < 18) {
      for (const h of [10, 12, 14, 16, 18, 20]) {
        if (h > now.getHours() + 2) {
          const slot = new Date(now);
          slot.setHours(h, 0, 0, 0);
          timeSlots.push({ label: `Today ${h}:00 - ${h + 2}:00`, value: slot.toISOString() });
        }
      }
    }
    for (const h of [9, 11, 13, 15, 17, 19]) {
      const slot = new Date(tomorrow);
      slot.setHours(h, 0, 0, 0);
      timeSlots.push({ label: `Tomorrow ${h}:00 - ${h + 2}:00`, value: slot.toISOString() });
    }
    return res.json({
      fulfillment_options: [
        { type: "quick_commerce", label_hi: "तुरंत डिलीवरी", label_en: "Quick Delivery", description_hi: "30-60 मिनट में डिलीवरी", description_en: "Delivery in 30-60 minutes", icon: "⚡", available: true, eta_minutes: 45, extra_charge: 0 },
        { type: "scheduled", label_hi: "समय निर्धारित डिलीवरी", label_en: "Scheduled Delivery", description_hi: "अपनी सुविधा अनुसार समय चुनें", description_en: "Choose your preferred time slot", icon: "📅", available: true, eta_minutes: null, extra_charge: 0, time_slots: timeSlots },
        { type: "pickup", label_hi: "स्वयं उठाएं", label_en: "Self Pickup", description_hi: "हमारे स्टोर से स्वयं उठाएं", description_en: "Pick up from our store", icon: "🏪", available: true, eta_minutes: null, extra_charge: -20, pickup_address: { name: "Digital Rohtak Store", address: "Sector 1, Model Town, Rohtak, Haryana", timings: "9 AM - 9 PM" } },
      ],
    });
  }

  return res.sendStatus(200);
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { action } = req.query as { action?: string };
  const deliveryService = req.scope.resolve(DELIVERY_MODULE);

  // POST /store/delivery?action=update-location
  // Writes GPS to Redis driver:loc:{driverId} (TTL 300s) and updates Driver.last_location_at
  // Requirements: 6.1, 6.7
  if (action === "update-location") {
    const customerId = await resolveCustomerFromToken(req);
    if (!customerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { driver_id, lat, lng } = req.body as { driver_id?: string; lat?: number; lng?: number };

    if (!driver_id || lat === undefined || lat === null || lng === undefined || lng === null) {
      return res.status(400).json({ error: "driver_id, lat, and lng are required" });
    }

    const latNum = typeof lat === "string" ? parseFloat(lat as any) : lat;
    const lngNum = typeof lng === "string" ? parseFloat(lng as any) : lng;

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ error: "lat and lng must be valid numbers" });
    }

    // updateDriverLocation writes to Redis with TTL 300s and updates last_location_at
    await deliveryService.updateDriverLocation(driver_id, latNum, lngNum);

    return res.json({ updated: true });
  }

  // POST /store/delivery?action=update-status
  // Confirms pickup or delivery milestone
  // Requirements: 6.3, 6.4, 8.3, 8.4
  if (action === "update-status") {
    const customerId = await resolveCustomerFromToken(req);
    if (!customerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { delivery_id, status, lat, lng } = req.body as {
      delivery_id?: string;
      status?: string;
      lat?: number;
      lng?: number;
    };

    if (!delivery_id || !status) {
      return res.status(400).json({ error: "delivery_id and status are required" });
    }

    if (status !== "picked_up" && status !== "delivered") {
      return res.status(400).json({
        error: "status must be 'picked_up' or 'delivered'",
        field: "status",
      });
    }

    // Fetch the DeliveryOrder
    const orders = await deliveryService.listDeliveryOrders({ id: [delivery_id] });
    if (orders.length === 0) {
      return res.status(404).json({ error: "DeliveryOrder not found" });
    }

    const order = orders[0];

    if (status === "picked_up") {
      // Validate current lifecycle_status is "assigned" (Requirement 8.3)
      if (order.lifecycle_status !== "assigned") {
        return res.status(409).json({
          error: `Cannot confirm pickup: current status is '${order.lifecycle_status}', expected 'assigned'`,
          code: "INVALID_STATUS_TRANSITION",
        });
      }

      // Update lifecycle_status to "picked_up"
      await deliveryService.updateDeliveryOrders([{
        id: delivery_id,
        lifecycle_status: "picked_up",
        picked_up_at: new Date(),
      }]);

      // Append TrackingEvent (Requirements 8.3, 8.5)
      await appendTrackingEvent(deliveryService, delivery_id, "picked_up", order.driver_id || null);

      return res.json({ delivery_id, lifecycle_status: "picked_up" });
    }

    if (status === "delivered") {
      // Validate current lifecycle_status is "picked_up" (Requirement 8.4)
      if (order.lifecycle_status !== "picked_up") {
        return res.status(409).json({
          error: `Cannot confirm delivery: current status is '${order.lifecycle_status}', expected 'picked_up'`,
          code: "INVALID_STATUS_TRANSITION",
        });
      }

      // Update lifecycle_status to "delivered"
      await deliveryService.updateDeliveryOrders([{
        id: delivery_id,
        lifecycle_status: "delivered",
        completed_at: new Date(),
      }]);

      // Update the linked Medusa Order status to "completed" (Requirement 8.4)
      if (order.order_id) {
        try {
          // Use native fetch (Node 20+) to call the internal admin API
          const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";
          await globalThis.fetch(`${backendUrl}/admin/orders/${order.order_id}/complete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-medusa-access-token": process.env.MEDUSA_ADMIN_API_TOKEN || "",
            },
          });
        } catch {
          // Best-effort — do not block the lifecycle update if Order completion fails
        }
      }

      // Append TrackingEvent (Requirements 8.4, 8.5)
      await appendTrackingEvent(deliveryService, delivery_id, "delivered", order.driver_id || null);

      return res.json({ delivery_id, lifecycle_status: "delivered" });
    }
  }

  return res.sendStatus(200);
}
