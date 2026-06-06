import type DeliveryModuleService from "../modules/delivery/services/delivery-module-service";

/**
 * Appends a TrackingEvent for a lifecycle status transition.
 *
 * GPS coordinates are resolved from the Redis hot cache (`driver:loc:{driverId}`)
 * via DeliveryModuleService.getDriverLocation. If the driver ID is absent or the
 * cache entry has expired, lat/lng are recorded as null — the transition is never
 * blocked by missing GPS data.
 *
 * Requirements: 8.5, 8.10
 */
export async function appendTrackingEvent(
  deliveryService: DeliveryModuleService,
  deliveryOrderId: string,
  newStatus: string,
  driverId: string | null,
): Promise<void> {
  // Resolve last-known GPS from Redis driver:loc:{driverId}; default to null if unavailable
  let lat: number | null = null;
  let lng: number | null = null;

  if (driverId) {
    try {
      const loc = await deliveryService.getDriverLocation(driverId);
      if (loc) {
        lat = loc.lat;
        lng = loc.lng;
      }
    } catch {
      // GPS resolution is best-effort — never block the transition
    }
  }

  await deliveryService.createTrackingEvents([
    {
      delivery_order_id: deliveryOrderId,
      status: newStatus,
      lat,
      lng,
    },
  ]);
}
