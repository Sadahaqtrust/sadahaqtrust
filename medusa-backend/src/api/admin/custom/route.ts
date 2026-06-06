import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

// Delivery status → Medusa fulfillment status mapping (native, no external dependency)
function mapDeliveryStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "not_fulfilled",
    dispatched: "partially_fulfilled",
    en_route: "partially_fulfilled",
    arrived: "partially_fulfilled",
    picked_up: "partially_fulfilled",
    completed: "fulfilled",
    delivered: "fulfilled",
    cancelled: "canceled",
    failed: "canceled",
  };
  return map[status] || "not_fulfilled";
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.sendStatus(200);
}

/**
 * POST /admin/custom?action=delivery-webhook
 * Receives delivery status updates from driver app
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { action } = req.query as { action?: string };
  if (action !== "delivery-webhook") return res.sendStatus(200);

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  try {
    const { delivery_order_id, status, driver_lat, driver_lng, message } = req.body as any;
    if (!delivery_order_id || !status) {
      return res.status(400).json({ error: "delivery_order_id and status required" });
    }

    // Find Medusa order by delivery_order_id in metadata
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "metadata"],
      filters: {},
    });

    const order = orders.find((o: any) => o.metadata?.delivery_order_id === delivery_order_id);
    if (!order) {
      return res.status(200).json({ received: true, matched: false });
    }

    const orderModule = req.scope.resolve(Modules.ORDER);
    await orderModule.updateOrders([{
      id: order.id,
      metadata: {
        ...order.metadata,
        delivery_status: status,
        driver_lat,
        driver_lng,
        last_delivery_update: new Date().toISOString(),
        delivery_message: message,
      },
    }]);

    logger.info(`[Delivery] Order ${order.id} status → ${status}`);
    return res.status(200).json({
      received: true,
      order_id: order.id,
      medusa_status: mapDeliveryStatus(status),
    });
  } catch (err: any) {
    logger.error(`[Delivery Webhook] ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
}
