import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { DELIVERY_MODULE } from "../modules/delivery";

const DEFAULT_PICKUP = {
  name: "Digital Rohtak Warehouse",
  address: "Sector 1, Model Town, Rohtak, Haryana 124001",
  lat: 28.8955,
  lng: 76.6066,
};

export default async function orderPlacedHandler({ event, container }: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const deliveryService = container.resolve(DELIVERY_MODULE);

  const orderId = event.data.id;
  logger.info(`[Delivery] Processing order: ${orderId}`);

  try {
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "email", "currency_code", "total", "metadata", "items.*", "shipping_address.*"],
      filters: { id: orderId },
    });

    if (!order) return;

    const fulfillmentType = (order.metadata?.fulfillment_type as any) || "quick_commerce";
    const scheduledAt = order.metadata?.scheduled_at ? new Date(order.metadata.scheduled_at as string) : undefined;

    const addr = order.shipping_address;
    const dropoffName = addr ? `${addr.first_name || ""} ${addr.last_name || ""}`.trim() : (order.email as string);
    const dropoffAddress = addr
      ? `${addr.address_1 || ""}, ${addr.city || "Rohtak"}, ${addr.country_code?.toUpperCase() || "IN"}`
      : "Rohtak, Haryana";

    const delivery = await deliveryService.createDelivery({
      order_id: orderId,
      fulfillment_type: fulfillmentType,
      pickup_name: DEFAULT_PICKUP.name,
      pickup_address: DEFAULT_PICKUP.address,
      pickup_lat: DEFAULT_PICKUP.lat,
      pickup_lng: DEFAULT_PICKUP.lng,
      dropoff_name: dropoffName || "Customer",
      dropoff_address: dropoffAddress,
      scheduled_at: scheduledAt,
      cod_amount: order.metadata?.payment_method === "cod" ? Math.round((order.total as number || 0) / 100) : 0,
      notes: `Order #${order.display_id}`,
      metadata: { fulfillment_type: fulfillmentType },
    });

    // Store delivery info back on Medusa order
    const orderModule = container.resolve(Modules.ORDER);
    await orderModule.updateOrders([{
      id: orderId,
      metadata: {
        ...(order.metadata as object || {}),
        delivery_order_id: delivery.id,
        tracking_number: delivery.tracking_number,
        delivery_status: "pending",
      },
    }]);

    logger.info(`[Delivery] Created delivery ${delivery.id} tracking: ${delivery.tracking_number}`);
  } catch (err: any) {
    logger.error(`[Delivery] Failed for order ${orderId}: ${err.message}`);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
