import { MedusaService } from "@medusajs/framework/utils";
import { Driver } from "../models/driver";
import { DeliveryOrder } from "../models/delivery-order";
import { ServiceZone } from "../models/service-zone";
import { TimeSlot } from "../models/time-slot";
import { TrackingEvent } from "../models/tracking-event";
import { createClient } from "redis";

// Haversine distance in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateTrackingNumber(): string {
  return "DR" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
}

class DeliveryModuleService extends MedusaService({
  Driver,
  DeliveryOrder,
  ServiceZone,
  TimeSlot,
  TrackingEvent,
}) {
  private redisClient: any = null;

  private async getRedis() {
    if (!this.redisClient) {
      try {
        this.redisClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
        await this.redisClient.connect();
      } catch {
        this.redisClient = null;
      }
    }
    return this.redisClient;
  }

  // ── Driver GPS (Redis hot cache) ──────────────────────────────────────────

  async updateDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
    const redis = await this.getRedis();
    if (redis) {
      await redis.setEx(`driver:loc:${driverId}`, 300, JSON.stringify({ lat, lng, ts: Date.now() }));
    }
    await this.updateDrivers([{ id: driverId, last_lat: lat, last_lng: lng, last_location_at: new Date() }]);
  }

  async getDriverLocation(driverId: string): Promise<{ lat: number; lng: number } | null> {
    const redis = await this.getRedis();
    if (redis) {
      const cached = await redis.get(`driver:loc:${driverId}`);
      if (cached) return JSON.parse(cached);
    }
    const [driver] = await this.listDrivers({ id: [driverId] });
    if (driver?.last_lat && driver?.last_lng) return { lat: driver.last_lat, lng: driver.last_lng };
    return null;
  }

  // ── Driver Assignment (nearest available driver) ──────────────────────────

  async findNearestDriver(pickupLat: number, pickupLng: number, maxRadiusKm = 15): Promise<any | null> {
    const available = await this.listDrivers({ status: ["available"], is_active: [true] });
    if (!available.length) return null;

    let nearest: any = null;
    let minDist = Infinity;

    for (const driver of available) {
      const loc = await this.getDriverLocation(driver.id);
      if (!loc) continue;
      const dist = haversine(pickupLat, pickupLng, loc.lat, loc.lng);
      if (dist < maxRadiusKm && dist < minDist) {
        minDist = dist;
        nearest = { ...driver, distance_km: dist };
      }
    }
    return nearest;
  }

  // ── Create Delivery Order ─────────────────────────────────────────────────

  async createDelivery(input: {
    order_id: string;
    fulfillment_type: "quick_commerce" | "scheduled" | "pickup";
    pickup_name: string;
    pickup_address: string;
    pickup_lat?: number;
    pickup_lng?: number;
    dropoff_name: string;
    dropoff_address: string;
    dropoff_lat?: number;
    dropoff_lng?: number;
    scheduled_at?: Date;
    cod_amount?: number;
    notes?: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const tracking_number = generateTrackingNumber();

    const delivery = await this.createDeliveryOrders([{
      ...input,
      tracking_number,
      status: "pending",
      cod_amount: input.cod_amount || 0,
    }]);

    await this.createTrackingEvents([{
      delivery_order_id: delivery[0].id,
      status: "pending",
      message: "Order received, finding driver",
      message_hi: "ऑर्डर प्राप्त हुआ, ड्राइवर खोज रहे हैं",
    }]);

    // Auto-assign driver for quick_commerce
    if (input.fulfillment_type === "quick_commerce" && input.pickup_lat && input.pickup_lng) {
      const driver = await this.findNearestDriver(input.pickup_lat, input.pickup_lng);
      if (driver) {
        await this.assignDriver(delivery[0].id, driver.id);
      }
    }

    return delivery[0];
  }

  // ── Assign Driver ─────────────────────────────────────────────────────────

  async assignDriver(deliveryId: string, driverId: string): Promise<any> {
    const eta = new Date(Date.now() + 45 * 60 * 1000); // 45 min ETA default

    await this.updateDeliveryOrders([{
      id: deliveryId,
      driver_id: driverId,
      status: "dispatched",
      dispatched_at: new Date(),
      estimated_arrival: eta,
    }]);

    await this.updateDrivers([{ id: driverId, status: "busy" }]);

    await this.createTrackingEvents([{
      delivery_order_id: deliveryId,
      status: "dispatched",
      message: "Driver assigned and on the way",
      message_hi: "ड्राइवर नियुक्त, रास्ते में है",
    }]);

    return { delivery_id: deliveryId, driver_id: driverId, eta };
  }

  // ── State Machine ─────────────────────────────────────────────────────────

  async updateDeliveryStatus(deliveryId: string, newStatus: string, meta?: { lat?: number; lng?: number; message?: string }): Promise<any> {
    const [delivery] = await this.listDeliveryOrders({ id: [deliveryId] });
    if (!delivery) throw new Error(`Delivery ${deliveryId} not found`);

    const validTransitions: Record<string, string[]> = {
      pending: ["dispatched", "cancelled"],
      dispatched: ["en_route", "cancelled"],
      en_route: ["arrived", "cancelled"],
      arrived: ["picked_up", "cancelled"],
      picked_up: ["completed", "failed"],
      completed: [],
      cancelled: [],
      failed: [],
    };

    if (!validTransitions[delivery.status]?.includes(newStatus)) {
      throw new Error(`Invalid transition: ${delivery.status} → ${newStatus}`);
    }

    const updates: any = { id: deliveryId, status: newStatus };
    if (newStatus === "picked_up") updates.picked_up_at = new Date();
    if (newStatus === "completed") {
      updates.completed_at = new Date();
      if (delivery.driver_id) {
        await this.updateDrivers([{ id: delivery.driver_id, status: "available" }]);
        const [driver] = await this.listDrivers({ id: [delivery.driver_id] });
        if (driver) {
          await this.updateDrivers([{ id: delivery.driver_id, total_deliveries: (driver.total_deliveries || 0) + 1 }]);
        }
      }
    }
    if (newStatus === "cancelled") {
      updates.cancelled_at = new Date();
      if (delivery.driver_id) await this.updateDrivers([{ id: delivery.driver_id, status: "available" }]);
    }

    await this.updateDeliveryOrders([updates]);

    const statusMessages: Record<string, { en: string; hi: string }> = {
      dispatched: { en: "Driver is on the way to pickup", hi: "ड्राइवर पिकअप के लिए जा रहा है" },
      en_route: { en: "Order picked up, heading to you", hi: "ऑर्डर उठाया, आपकी तरफ आ रहा है" },
      arrived: { en: "Driver arrived at pickup", hi: "ड्राइवर पिकअप पर पहुंचा" },
      picked_up: { en: "Order picked up, out for delivery", hi: "ऑर्डर उठाया, डिलीवरी के लिए निकला" },
      completed: { en: "Order delivered successfully", hi: "ऑर्डर सफलतापूर्वक डिलीवर हुआ" },
      cancelled: { en: "Order cancelled", hi: "ऑर्डर रद्द किया गया" },
      failed: { en: "Delivery failed", hi: "डिलीवरी विफल" },
    };

    await this.createTrackingEvents([{
      delivery_order_id: deliveryId,
      status: newStatus,
      message: meta?.message || statusMessages[newStatus]?.en,
      message_hi: statusMessages[newStatus]?.hi,
      lat: meta?.lat,
      lng: meta?.lng,
    }]);

    return { delivery_id: deliveryId, status: newStatus };
  }

  // ── Tracking ──────────────────────────────────────────────────────────────

  async getTrackingInfo(trackingNumber: string): Promise<any> {
    const [delivery] = await this.listDeliveryOrders({ tracking_number: [trackingNumber] });
    if (!delivery) return null;

    const events = await this.listTrackingEvents({ delivery_order_id: [delivery.id] });
    let driverLocation: { lat: number; lng: number } | null = null;
    if (delivery.driver_id) {
      driverLocation = await this.getDriverLocation(delivery.driver_id);
    }

    return { delivery, events: events.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), driver_location: driverLocation as any };
  }

  // ── Time Slots ────────────────────────────────────────────────────────────

  async getAvailableTimeSlots(date?: string): Promise<any[]> {
    const targetDate = date || new Date().toISOString().split("T")[0];
    const slots = await this.listTimeSlots({ slot_date: [targetDate], is_active: [true] });
    return slots.filter((s: any) => s.booked_orders < s.max_orders);
  }

  async bookTimeSlot(slotId: string): Promise<void> {
    const [slot] = await this.listTimeSlots({ id: [slotId] });
    if (!slot) throw new Error("Time slot not found");
    if (slot.booked_orders >= slot.max_orders) throw new Error("Time slot fully booked");
    await this.updateTimeSlots([{ id: slotId, booked_orders: slot.booked_orders + 1 }]);
  }

  // ── Service Zone ──────────────────────────────────────────────────────────

  async getDeliveryCharge(lat: number, lng: number, orderTotal: number): Promise<{ charge: number; zone: any | null }> {
    const zones = await this.listServiceZones({ is_active: [true] });
    for (const zone of zones) {
      const dist = haversine(lat, lng, zone.center_lat, zone.center_lng);
      if (dist <= zone.radius_km) {
        if (orderTotal >= zone.free_delivery_above) return { charge: 0, zone };
        const charge = zone.base_charge + dist * zone.per_km_charge;
        return { charge: Math.round(charge), zone };
      }
    }
    return { charge: 50, zone: null }; // default charge outside zones
  }
}

export default DeliveryModuleService;
