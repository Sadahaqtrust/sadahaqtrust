import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedIndia({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);

  // Get India region
  const regionService = container.resolve(Modules.REGION);
  const [indiaRegion] = await regionService.listRegions({ name: "India" });
  if (!indiaRegion) { logger.error("India region not found"); return; }
  logger.info(`India region: ${indiaRegion.id}`);

  // Get default sales channel
  const [salesChannel] = await salesChannelModuleService.listSalesChannels({ name: "Default Sales Channel" });

  // Get or create shipping profile
  const profiles = await fulfillmentModuleService.listShippingProfiles({ type: "default" });
  const shippingProfile = profiles[0];

  // Create India stock location
  const { result: [stockLocation] } = await createStockLocationsWorkflow(container).run({
    input: { locations: [{ name: "Rohtak Warehouse", address: { city: "Rohtak", country_code: "IN", address_1: "Rohtak, Haryana" } }] },
  });
  logger.info(`Stock location: ${stockLocation.id}`);

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  });

  // Create India fulfillment set with geo zone
  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Rohtak Delivery",
    type: "shipping",
    service_zones: [{
      name: "India",
      geo_zones: [{ country_code: "in", type: "country" }],
    }],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  });

  // Create shipping option for India region
  const { result } = await createShippingOptionsWorkflow(container).run({
    input: [{
      name: "Home Delivery",
      price_type: "flat",
      provider_id: "manual_manual",
      service_zone_id: fulfillmentSet.service_zones[0].id,
      shipping_profile_id: shippingProfile.id,
      type: { label: "Standard", description: "Delivery in 30-60 minutes", code: "standard" },
      prices: [
        { currency_code: "inr", amount: 0 },
        { region_id: indiaRegion.id, amount: 0 },
      ],
      rules: [
        { attribute: "enabled_in_store", value: "true", operator: "eq" },
        { attribute: "is_return", value: "false", operator: "eq" },
      ],
    }],
  });

  const shippingOptionId = result[0].id;
  logger.info(`Shipping option created: ${shippingOptionId}`);

  // Link stock location to sales channel
  if (salesChannel) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation.id, add: [salesChannel.id] },
    });
  }

  logger.info("India seed complete. Update SHIPPING_OPTION_ID in cart/page.tsx to: " + shippingOptionId);
}
