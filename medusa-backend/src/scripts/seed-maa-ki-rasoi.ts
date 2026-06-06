import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createSalesChannelsWorkflow,
  createProductCategoriesWorkflow,
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedMaaKiRasoi({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // ── 1. Sales Channel ──────────────────────────────────────────────────────
  logger.info("Creating Maa-Ki-Rasoi sales channel...");
  const { result: [salesChannel] } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [{
        name: "Maa-Ki-Rasoi",
        description: "Homestyle Indian food — Rohtak, Haryana. FSSAI Licensed.",
        is_disabled: false,
        metadata: {
          google_business_category: "Food & Beverage > Restaurant",
          fssai_license: "PENDING",
          gst_number: "PENDING",
          owner_name: "PENDING",
          mobile: "PENDING",
          address: "Rohtak, Haryana",
          cuisine_type: "North Indian, Home Style",
          veg_nonveg: "Both",
          subdomain: "food.digitalrohtak.online",
        },
      }],
    },
  });
  logger.info(`Sales channel created: ${salesChannel.id} — ${salesChannel.name}`);

  // ── 2. FSSAI Food Categories ──────────────────────────────────────────────
  logger.info("Creating FSSAI food categories...");
  const { result: categories } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [
        { name: "Starters & Snacks",      is_active: true, metadata: { fssai_category: "Processed Food", google_category: "Food & Beverage > Snack Food" } },
        { name: "Main Course",            is_active: true, metadata: { fssai_category: "Cooked Food", google_category: "Food & Beverage > Restaurant" } },
        { name: "Breads & Rice",          is_active: true, metadata: { fssai_category: "Cereal & Grain Products", google_category: "Food & Beverage > Bread" } },
        { name: "Dal & Curries",          is_active: true, metadata: { fssai_category: "Cooked Food", google_category: "Food & Beverage > Restaurant" } },
        { name: "Beverages",              is_active: true, metadata: { fssai_category: "Beverages", google_category: "Food & Beverage > Beverages" } },
        { name: "Desserts & Sweets",      is_active: true, metadata: { fssai_category: "Confectionery", google_category: "Food & Beverage > Desserts" } },
        { name: "Thali & Combos",         is_active: true, metadata: { fssai_category: "Cooked Food", google_category: "Food & Beverage > Restaurant" } },
        { name: "Pickles & Chutneys",     is_active: true, metadata: { fssai_category: "Condiments & Sauces", google_category: "Food & Beverage > Condiments" } },
        { name: "Seasonal Specials",      is_active: true, metadata: { fssai_category: "Cooked Food", google_category: "Food & Beverage > Restaurant" } },
      ],
    },
  });
  logger.info(`Created ${categories.length} food categories`);

  // ── 3. Publishable API Key scoped to Maa-Ki-Rasoi ────────────────────────
  logger.info("Creating publishable API key for Maa-Ki-Rasoi...");
  const { result: [apiKey] } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [{
        title: "Maa-Ki-Rasoi Storefront Key",
        type: "publishable",
        created_by: "",
      }],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKey.id, add: [salesChannel.id] },
  });

  logger.info(`API Key: ${apiKey.token}`);
  logger.info("─────────────────────────────────────────────────────");
  logger.info("Maa-Ki-Rasoi setup complete:");
  logger.info(`  Sales Channel ID : ${salesChannel.id}`);
  logger.info(`  API Key          : ${apiKey.token}`);
  logger.info(`  Categories       : ${categories.map((c: any) => c.name).join(", ")}`);
  logger.info("─────────────────────────────────────────────────────");
  logger.info("Next steps:");
  logger.info("  1. Update FSSAI license, GST, owner details in Medusa admin");
  logger.info("  2. Add API key to food.digitalrohtak.online .env as NEXT_PUBLIC_PUBLISHABLE_KEY_FOOD");
  logger.info("  3. Use CSV template to bulk import menu items");
}
