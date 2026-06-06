import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { DELIVERY_MODULE } from "../../../modules/delivery";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { action, id, status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const deliveryService = req.scope.resolve(DELIVERY_MODULE);
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // GET /admin/delivery?action=drivers
  if (action === "drivers") {
    const filters: any = {};
    if (status) filters.status = [status];
    const drivers = await deliveryService.listDrivers(filters, { skip: offset, take: parseInt(limit) });
    const count = await deliveryService.listDrivers(filters);
    return res.json({ drivers, count: count.length, page: parseInt(page), limit: parseInt(limit) });
  }

  // GET /admin/delivery?action=driver&id=drv_xxx
  if (action === "driver" && id) {
    const [driver] = await deliveryService.listDrivers({ id: [id] });
    if (!driver) return res.status(404).json({ error: "Driver not found" });
    const location = await deliveryService.getDriverLocation(id);
    return res.json({ driver, location });
  }

  // GET /admin/delivery?action=orders&status=pending
  if (action === "orders") {
    const filters: any = {};
    if (status) filters.status = [status];
    const orders = await deliveryService.listDeliveryOrders(filters, { skip: offset, take: parseInt(limit) });
    const count = await deliveryService.listDeliveryOrders(filters);
    return res.json({ orders, count: count.length, page: parseInt(page), limit: parseInt(limit) });
  }

  // GET /admin/delivery?action=order&id=del_xxx
  if (action === "order" && id) {
    const [order] = await deliveryService.listDeliveryOrders({ id: [id] });
    if (!order) return res.status(404).json({ error: "Delivery order not found" });
    const events = await deliveryService.listTrackingEvents({ delivery_order_id: [id] });
    return res.json({ order, events });
  }

  // GET /admin/delivery?action=dashboard
  if (action === "dashboard") {
    const [pending, dispatched, completed, cancelled, totalDrivers, availableDrivers] = await Promise.all([
      deliveryService.listDeliveryOrders({ status: ["pending"] }),
      deliveryService.listDeliveryOrders({ status: ["dispatched", "en_route", "arrived", "picked_up"] }),
      deliveryService.listDeliveryOrders({ status: ["completed"] }),
      deliveryService.listDeliveryOrders({ status: ["cancelled", "failed"] }),
      deliveryService.listDrivers({ is_active: [true] }),
      deliveryService.listDrivers({ status: ["available"], is_active: [true] }),
    ]);
    return res.json({
      stats: {
        pending: pending.length,
        active: dispatched.length,
        completed: completed.length,
        cancelled: cancelled.length,
        total_drivers: totalDrivers.length,
        available_drivers: availableDrivers.length,
      },
    });
  }

  // GET /admin/delivery?action=zones
  if (action === "zones") {
    const zones = await deliveryService.listServiceZones({});
    return res.json({ zones });
  }

  return res.sendStatus(200);
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { action } = req.query as { action?: string };
  const deliveryService = req.scope.resolve(DELIVERY_MODULE);

  // POST /admin/delivery?action=create-driver
  if (action === "create-driver") {
    const { name, phone, email, vehicle_type, vehicle_number } = req.body as any;
    if (!name || !phone) return res.status(400).json({ error: "name and phone required" });
    const [driver] = await deliveryService.createDrivers([{ name, phone, email, vehicle_type: vehicle_type || "bike", vehicle_number }]);
    return res.status(201).json({ driver });
  }

  // POST /admin/delivery?action=update-driver
  if (action === "update-driver") {
    const { id, ...updates } = req.body as any;
    if (!id) return res.status(400).json({ error: "id required" });
    await deliveryService.updateDrivers([{ id, ...updates }]);
    const [driver] = await deliveryService.listDrivers({ id: [id] });
    return res.json({ driver });
  }

  // POST /admin/delivery?action=assign-driver
  if (action === "assign-driver") {
    const { delivery_id, driver_id } = req.body as any;
    if (!delivery_id || !driver_id) return res.status(400).json({ error: "delivery_id and driver_id required" });
    const result = await deliveryService.assignDriver(delivery_id, driver_id);
    return res.json(result);
  }

  // POST /admin/delivery?action=update-status
  if (action === "update-status") {
    const { delivery_id, status, message } = req.body as any;
    if (!delivery_id || !status) return res.status(400).json({ error: "delivery_id and status required" });
    const result = await deliveryService.updateDeliveryStatus(delivery_id, status, { message });
    return res.json(result);
  }

  // POST /admin/delivery?action=create-zone
  if (action === "create-zone") {
    const { name, city, center_lat, center_lng, radius_km, base_charge, per_km_charge, free_delivery_above } = req.body as any;
    if (!name || !center_lat || !center_lng) return res.status(400).json({ error: "name, center_lat, center_lng required" });
    const [zone] = await deliveryService.createServiceZones([{ name, city: city || "Rohtak", center_lat, center_lng, radius_km: radius_km || 10, base_charge: base_charge || 0, per_km_charge: per_km_charge || 5, free_delivery_above: free_delivery_above || 500 }]);
    return res.status(201).json({ zone });
  }

  return res.sendStatus(200);
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { action, id } = req.query as { action?: string; id?: string };
  const deliveryService = req.scope.resolve(DELIVERY_MODULE);

  if (action === "delete-driver" && id) {
    await deliveryService.updateDrivers([{ id, is_active: false }]);
    return res.json({ deleted: true });
  }

  return res.sendStatus(200);
}
