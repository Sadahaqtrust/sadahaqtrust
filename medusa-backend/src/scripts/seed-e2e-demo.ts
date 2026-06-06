/**
 * seed-e2e-demo.ts
 *
 * Creates the full demo dataset for end-to-end testing:
 *   1. Maa ki Rasoi restaurant (sales channel + seller customer group + dishes)
 *   2. 10 dummy riders (Driver records + customer accounts)
 *   3. 5 dummy customers
 *   4. INR region + Rohtak zone
 *
 * Run: cd medusa-backend && npx medusa exec ./src/scripts/seed-e2e-demo.ts
 *
 * Delivery address used for E2E test:
 *   3rd Floor, Room 209-R, Model Town, Rohtak, Haryana 124001
 *   GPS: 28.8934, 76.6108
 */

import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import {
  createSalesChannelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createApiKeysWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  createShippingProfilesWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows";
import { DELIVERY_MODULE } from "../modules/delivery";

// ─── Config ──────────────────────────────────────────────────────────────────

const ROHTAK_LAT = 28.8955;
const ROHTAK_LNG = 76.6066;
const DELIVERY_ADDRESS = "3rd Floor, Room 209-R, Model Town, Rohtak, Haryana 124001";
const DELIVERY_LAT = 28.8934;
const DELIVERY_LNG = 76.6108;
const DELIVERY_FEE_PAISE = 2500; // ₹25

// ─── Rider seed data ──────────────────────────────────────────────────────────

const RIDERS = [
  { name: "Rajesh Kumar",    phone: "9812345601", email: "rajesh.rider@digitalrohtak.test",   vehicle: "Motorcycle", vehicle_number: "HR12AA0001", upi: "rajesh.rider@upi" },
  { name: "Suresh Yadav",    phone: "9812345602", email: "suresh.rider@digitalrohtak.test",   vehicle: "Motorcycle", vehicle_number: "HR12AA0002", upi: "suresh.rider@upi" },
  { name: "Amit Singh",      phone: "9812345603", email: "amit.rider@digitalrohtak.test",     vehicle: "Bicycle",    vehicle_number: "HR12AA0003", upi: "amit.rider@upi"  },
  { name: "Vijay Sharma",    phone: "9812345604", email: "vijay.rider@digitalrohtak.test",    vehicle: "Motorcycle", vehicle_number: "HR12AA0004", upi: "vijay.rider@upi"  },
  { name: "Deepak Verma",    phone: "9812345605", email: "deepak.rider@digitalrohtak.test",   vehicle: "Car",        vehicle_number: "HR12AB0005", upi: "deepak.rider@upi" },
  { name: "Rahul Malik",     phone: "9812345606", email: "rahul.rider@digitalrohtak.test",    vehicle: "Motorcycle", vehicle_number: "HR12AA0006", upi: "rahul.rider@upi"  },
  { name: "Sanjay Gupta",    phone: "9812345607", email: "sanjay.rider@digitalrohtak.test",   vehicle: "Motorcycle", vehicle_number: "HR12AA0007", upi: "sanjay.rider@upi" },
  { name: "Manish Thakur",   phone: "9812345608", email: "manish.rider@digitalrohtak.test",   vehicle: "Bicycle",    vehicle_number: "HR12AA0008", upi: "manish.rider@upi" },
  { name: "Kapil Hooda",     phone: "9812345609", email: "kapil.rider@digitalrohtak.test",    vehicle: "Van",        vehicle_number: "HR12AC0009", upi: "kapil.rider@upi"  },
  { name: "Pankaj Khatri",   phone: "9812345610", email: "pankaj.rider@digitalrohtak.test",   vehicle: "Motorcycle", vehicle_number: "HR12AA0010", upi: "pankaj.rider@upi" },
];

// ─── Customer seed data ───────────────────────────────────────────────────────

const CUSTOMERS = [
  { first_name: "Priya",   last_name: "Arora",   email: "priya.customer@digitalrohtak.test",   phone: "9876543201" },
  { first_name: "Rohit",   last_name: "Bansal",  email: "rohit.customer@digitalrohtak.test",   phone: "9876543202" },
  { first_name: "Sneha",   last_name: "Jain",    email: "sneha.customer@digitalrohtak.test",   phone: "9876543203" },
  { first_name: "Vikram",  last_name: "Nanda",   email: "vikram.customer@digitalrohtak.test",  phone: "9876543204" },
  { first_name: "Kavita",  last_name: "Sharma",  email: "kavita.customer@digitalrohtak.test",  phone: "9876543205" },
];

// ─── Maa ki Rasoi dishes ──────────────────────────────────────────────────────

const MKR_DISHES = [
  {
    title: "Dal Makhani",
    description: "Slow-cooked black lentils with butter and cream. A Rohtak household staple.",
    category: "Dal & Curries",
    variants: [
      { title: "Half (250g)",  price_inr: 120 },
      { title: "Full (500g)",  price_inr: 220 },
    ],
  },
  {
    title: "Paneer Butter Masala",
    description: "Cottage cheese cubes in rich tomato-cream gravy. Pairs perfectly with roti.",
    category: "Main Course",
    variants: [
      { title: "Half",  price_inr: 150 },
      { title: "Full",  price_inr: 280 },
    ],
  },
  {
    title: "Aloo Paratha",
    description: "Whole-wheat flatbread stuffed with spiced potato. Served with curd and pickle.",
    category: "Breads & Rice",
    variants: [
      { title: "1 Paratha",   price_inr: 40 },
      { title: "2 Parathas",  price_inr: 75 },
      { title: "4 Parathas",  price_inr: 140 },
    ],
  },
  {
    title: "Chole Bhature",
    description: "Spicy chickpea curry with deep-fried puffed bread. A Rohtak breakfast favourite.",
    category: "Main Course",
    variants: [
      { title: "1 Plate (2 bhature)",   price_inr: 80 },
      { title: "2 Plates (4 bhature)",  price_inr: 150 },
    ],
  },
  {
    title: "Kadhi Pakora",
    description: "Yoghurt-based curry with gram-flour fritters. Home-style comfort food.",
    category: "Dal & Curries",
    variants: [
      { title: "Bowl (300ml)",  price_inr: 100 },
      { title: "Family (600ml)", price_inr: 180 },
    ],
  },
  {
    title: "Jeera Rice",
    description: "Fragrant basmati rice tempered with cumin. Perfect companion to any curry.",
    category: "Breads & Rice",
    variants: [
      { title: "Half Plate",  price_inr: 70 },
      { title: "Full Plate",  price_inr: 130 },
    ],
  },
  {
    title: "Aloo Sabzi",
    description: "Dry spiced potato stir-fry with ajwain and coriander.",
    category: "Main Course",
    variants: [
      { title: "250g",  price_inr: 80 },
      { title: "500g",  price_inr: 150 },
    ],
  },
  {
    title: "Mango Lassi",
    description: "Thick blended yoghurt drink with Alphonso mango pulp.",
    category: "Beverages",
    variants: [
      { title: "300ml",  price_inr: 60 },
      { title: "500ml",  price_inr: 90 },
    ],
  },
  {
    title: "Gajar Halwa",
    description: "Slow-cooked carrot dessert with khoya, cardamom and dry fruits.",
    category: "Desserts & Sweets",
    variants: [
      { title: "150g",  price_inr: 90 },
      { title: "300g",  price_inr: 170 },
    ],
  },
  {
    title: "Veg Thali",
    description: "Complete meal: dal + sabzi + 2 roti + rice + pickle + papad. Best value.",
    category: "Thali & Combos",
    variants: [
      { title: "Regular Thali",  price_inr: 180 },
      { title: "Deluxe Thali",   price_inr: 250 },
    ],
  },
  {
    title: "Samosa",
    description: "Crispy fried pastry filled with spiced potatoes and peas.",
    category: "Starters & Snacks",
    variants: [
      { title: "2 Pieces",  price_inr: 30 },
      { title: "4 Pieces",  price_inr: 55 },
    ],
  },
  {
    title: "Aam ka Achaar",
    description: "Traditional raw mango pickle with mustard oil and spices.",
    category: "Pickles & Chutneys",
    variants: [
      { title: "100g jar",  price_inr: 50 },
      { title: "250g jar",  price_inr: 110 },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function upsertCustomer(params: {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  password?: string;
}): Promise<string> {
  const passwordHash = params.password
    ? await bcrypt.hash(params.password, 10)
    : await bcrypt.hash("Demo@123!", 10);

  // Check if customer already exists
  const { rows: existing } = await pool.query(
    `SELECT id FROM customer WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
    [params.email]
  );
  if (existing.length > 0) return existing[0].id;

  const id = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Insert customer — no ON CONFLICT (no unique constraint on email in some Medusa versions)
  const { rows: insertedRows } = await pool.query(
    `INSERT INTO customer (id, email, first_name, last_name, has_account, created_at, updated_at)
     VALUES ($1, $2, $3, $4, true, NOW(), NOW())
     RETURNING id`,
    [id, params.email, params.first_name, params.last_name]
  );
  const customerId = insertedRows[0]?.id ?? id;

  // Create auth_identity for JWT-based login
  const authId = `auth_${customerId}`;
  const { rows: existingAuth } = await pool.query(
    `SELECT id FROM auth_identity WHERE id = $1 LIMIT 1`, [authId]
  );
  if (existingAuth.length === 0) {
    await pool.query(
      `INSERT INTO auth_identity (id, app_metadata, created_at, updated_at)
       VALUES ($1, $2::jsonb, NOW(), NOW())`,
      [authId, JSON.stringify({ customer_id: customerId })]
    );
  }

  // Create provider_identity for email+password auth
  const piId = `pi_${customerId}`;
  const { rows: existingPi } = await pool.query(
    `SELECT id FROM provider_identity WHERE id = $1 LIMIT 1`, [piId]
  );
  if (existingPi.length === 0) {
    await pool.query(
      `INSERT INTO provider_identity (id, entity_id, provider, provider_metadata, auth_identity_id, created_at, updated_at)
       VALUES ($1, $2, 'emailpass', $3::jsonb, $4, NOW(), NOW())`,
      [piId, params.email, JSON.stringify({ password: passwordHash }), authId]
    );
  }

  return customerId;
}

async function assignCustomerGroup(customerId: string, groupId: string): Promise<void> {
  // Check if already assigned
  const { rows } = await pool.query(
    `SELECT customer_id FROM customer_group_customer WHERE customer_id = $1 AND customer_group_id = $2 LIMIT 1`,
    [customerId, groupId]
  );
  if (rows.length > 0) return;

  const cgcId = `cgc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await pool.query(
    `INSERT INTO customer_group_customer (id, customer_id, customer_group_id, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())`,
    [cgcId, customerId, groupId]
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default async function seedE2EDemo({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const deliveryService = container.resolve(DELIVERY_MODULE);
  const customerModuleService = container.resolve(Modules.CUSTOMER);
  const storeModuleService = container.resolve(Modules.STORE);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);

  logger.info("=== E2E Demo Seed: Digital Rohtak ===");

  // ── 1. Rohtak INR Region ─────────────────────────────────────────────────────
  logger.info("1. Creating Rohtak INR region...");
  let regionId: string;
  try {
    const { result: [region] } = await createRegionsWorkflow(container).run({
      input: {
        regions: [{
          name: "Rohtak / Haryana",
          currency_code: "inr",
          countries: ["in"],
          payment_providers: ["pp_system_default"],
        }],
      },
    });
    regionId = region.id;
    logger.info(`   Region created: ${region.id}`);
  } catch (err: any) {
    // Likely already exists
    const { rows } = await pool.query(
      `SELECT id FROM region WHERE name = 'Rohtak / Haryana' LIMIT 1`
    );
    regionId = rows[0]?.id ?? "region_unknown";
    logger.info(`   Region already exists: ${regionId}`);
  }

  // ── 2. Stock location (Rohtak Warehouse) ────────────────────────────────────
  logger.info("2. Creating Rohtak warehouse stock location...");
  let stockLocationId: string;
  try {
    const { result: [loc] } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [{
          name: "Rohtak Model Town Warehouse",
          address: {
            city: "Rohtak",
            country_code: "IN",
            address_1: "Sector 1, Model Town",
          },
        }],
      },
    });
    stockLocationId = loc.id;
    logger.info(`   Stock location: ${loc.id}`);
  } catch {
    const { rows } = await pool.query(
      `SELECT id FROM stock_location WHERE name = 'Rohtak Model Town Warehouse' LIMIT 1`
    );
    stockLocationId = rows[0]?.id ?? "";
    logger.info(`   Stock location already exists: ${stockLocationId}`);
  }

  // ── 3. Shipping profile ──────────────────────────────────────────────────────
  logger.info("3. Setting up shipping profile...");
  let shippingProfileId: string;
  const fulfillmentService = container.resolve(Modules.FULFILLMENT);
  const profiles = await fulfillmentService.listShippingProfiles({ type: "default" });
  if (profiles.length > 0) {
    shippingProfileId = profiles[0].id;
  } else {
    const { result: [sp] } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Rohtak Delivery", type: "default" }] },
    });
    shippingProfileId = sp.id;
  }
  logger.info(`   Shipping profile: ${shippingProfileId}`);

  // ── 4. Maa ki Rasoi Sales Channel ───────────────────────────────────────────
  logger.info("4. Creating Maa ki Rasoi sales channel...");
  let maaKiRasoiChannelId: string;

  const existingChannels = await salesChannelModuleService.listSalesChannels({ name: "Maa ki Rasoi" });
  if (existingChannels.length > 0) {
    maaKiRasoiChannelId = existingChannels[0].id;
    logger.info(`   Sales channel already exists: ${maaKiRasoiChannelId}`);
  } else {
    const { result: [sc] } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [{
          name: "Maa ki Rasoi",
          description: "Homestyle North Indian food from the heart of Rohtak. घर जैसा खाना।",
          is_disabled: false,
          metadata: {
            restaurant_type: "Home Kitchen",
            cuisine: "North Indian, Home Style",
            veg_nonveg: "Veg",
            owner: "Savita Devi",
            address: "House No. 45, Sector 3, Model Town, Rohtak, Haryana 124001",
            phone: "9812340001",
            open_time: "08:00",
            close_time: "21:00",
            channel_handle: "food",
            store_name: "Maa ki Rasoi",
            fssai_license: "DEMO-FSSAI-12345",
            gst: "06AABCS1429B1ZB",
            upi_vpa: "maakirasoi@upi",
          },
        }],
      },
    });
    maaKiRasoiChannelId = sc.id;
    logger.info(`   Sales channel created: ${maaKiRasoiChannelId}`);
  }

  // ── 5. Create publishable API key for Maa ki Rasoi ──────────────────────────
  logger.info("5. Creating API key for Maa ki Rasoi...");
  const { result: [apiKey] } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [{
        title: "Maa-ki-Rasoi Demo Key",
        type: "publishable",
        created_by: "seed-e2e-demo",
      }],
    },
  });
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKey.id, add: [maaKiRasoiChannelId] },
  });
  if (stockLocationId) {
    try {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: stockLocationId, add: [maaKiRasoiChannelId] },
      });
    } catch { /* ignore if already linked */ }
  }
  logger.info(`   API key: ${apiKey.token}`);

  // ── 6. Food product categories ───────────────────────────────────────────────
  logger.info("6. Creating food categories...");
  const categoryNames = [
    "Dal & Curries", "Main Course", "Breads & Rice",
    "Beverages", "Desserts & Sweets", "Thali & Combos",
    "Starters & Snacks", "Pickles & Chutneys",
  ];

  const categoryMap: Record<string, string> = {};
  for (const name of categoryNames) {
    try {
      const { result: [cat] } = await createProductCategoriesWorkflow(container).run({
        input: { product_categories: [{ name, is_active: true }] },
      });
      categoryMap[name] = cat.id;
    } catch {
      const { rows } = await pool.query(
        `SELECT id FROM product_category WHERE name = $1 AND deleted_at IS NULL LIMIT 1`,
        [name]
      );
      if (rows[0]) categoryMap[name] = rows[0].id;
    }
  }
  logger.info(`   Categories: ${Object.keys(categoryMap).join(", ")}`);

  // ── 7. Create Maa ki Rasoi dishes (products) ─────────────────────────────────
  logger.info("7. Creating Maa ki Rasoi menu items...");
  const createdProducts: string[] = [];

  // Check existing dishes from prior runs
  const { rows: existingDishes } = await pool.query(
    `SELECT id FROM product WHERE handle LIKE '%-mkr' AND deleted_at IS NULL`
  );
  existingDishes.forEach((r: any) => createdProducts.push(r.id));
  if (existingDishes.length > 0) {
    logger.info(`   ${existingDishes.length} dishes already exist from previous run`);
  }

  for (const dish of MKR_DISHES) {
    const categoryId = categoryMap[dish.category];
    try {
      const { result: [product] } = await createProductsWorkflow(container).run({
        input: {
          products: [{
            title: dish.title,
            description: dish.description,
            handle: dish.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + `-mkr`,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfileId,
            sales_channels: [{ id: maaKiRasoiChannelId }],
            ...(categoryId ? { category_ids: [categoryId] } : {}),
            options: [{ title: "Size", values: dish.variants.map(v => v.title) }],
            variants: dish.variants.map(v => ({
              title: v.title,
              sku: `MKR-${dish.title.slice(0, 4).toUpperCase()}-${v.title.slice(0, 3).toUpperCase()}`.replace(/\s/g, ""),
              options: { Size: v.title },
              prices: [{ amount: v.price_inr * 100, currency_code: "inr" }],
              inventory_quantity: 999,
              manage_inventory: false,
            })),
          }],
        },
      });
      createdProducts.push(product.id);
      logger.info(`   ✓ ${dish.title}`);
    } catch (err: any) {
      logger.warn(`   ✗ ${dish.title}: ${err.message}`);
    }
  }
  logger.info(`   Created ${createdProducts.length}/${MKR_DISHES.length} dishes`);

  // ── 8. Seller customer for Maa ki Rasoi ──────────────────────────────────────
  logger.info("8. Creating Maa ki Rasoi seller account...");
  const mkrSellerId = await upsertCustomer({
    email: "mkr.seller@digitalrohtak.test",
    first_name: "Savita",
    last_name: "Devi",
    phone: "9812340001",
    password: "MKRseller@123",
  });

  // Create seller customer group linked to Maa ki Rasoi channel
  const { rows: existingSellerGroup } = await pool.query(
    `SELECT id FROM customer_group WHERE name = 'Maa ki Rasoi Sellers' AND deleted_at IS NULL LIMIT 1`
  );
  let sellerGroupId: string;
  if (existingSellerGroup.length > 0) {
    sellerGroupId = existingSellerGroup[0].id;
  } else {
    sellerGroupId = `cg_mkr_${Date.now()}`;
    await pool.query(
      `INSERT INTO customer_group (id, name, metadata, created_at, updated_at)
       VALUES ($1, 'Maa ki Rasoi Sellers', $2::jsonb, NOW(), NOW())`,
      [sellerGroupId, JSON.stringify({
        type: "seller",
        channel_handle: "food",
        sales_channel_id: maaKiRasoiChannelId,
        store_name: "Maa ki Rasoi",
        upi_vpa: "maakirasoi@upi",
      })]
    );
  }
  await assignCustomerGroup(mkrSellerId, sellerGroupId);
  logger.info(`   Seller: mkr.seller@digitalrohtak.test (password: MKRseller@123)`);
  logger.info(`   Seller group ID: ${sellerGroupId}`);

  // ── 9. Rohtak Service Zone ───────────────────────────────────────────────────
  logger.info("9. Creating Rohtak delivery zone...");
  let zoneId: string;
  const existingZones = await deliveryService.listServiceZones({ is_active: [true] });
  if (existingZones.length > 0) {
    zoneId = existingZones[0].id;
    logger.info(`   Existing zone: ${zoneId}`);
  } else {
    const [zone] = await deliveryService.createServiceZones([{
      name: "Rohtak City Zone",
      is_active: true,
      metadata: {
        city: "Rohtak",
        state: "Haryana",
        lat_center: ROHTAK_LAT,
        lng_center: ROHTAK_LNG,
        radius_km: 15,
      },
    }]);
    zoneId = zone.id;
    logger.info(`   Zone created: ${zoneId}`);
  }

  // ── 10. Create 10 Riders ─────────────────────────────────────────────────────
  logger.info("10. Creating 10 demo riders...");

  // Create rider customer group
  const { rows: existingRiderGroup } = await pool.query(
    `SELECT id FROM customer_group WHERE name = 'Demo Riders' AND deleted_at IS NULL LIMIT 1`
  );
  let riderGroupId: string;
  if (existingRiderGroup.length > 0) {
    riderGroupId = existingRiderGroup[0].id;
  } else {
    riderGroupId = `cg_riders_${Date.now()}`;
    await pool.query(
      `INSERT INTO customer_group (id, name, metadata, created_at, updated_at)
       VALUES ($1, 'Demo Riders', $2::jsonb, NOW(), NOW())`,
      [riderGroupId, JSON.stringify({ type: "rider" })]
    );
  }

  const vehicleTypeMap: Record<string, string> = {
    Bicycle: "bike",
    Motorcycle: "bike",
    Car: "car",
    Van: "van",
  };

  const riderResults: Array<{ email: string; driverId: string }> = [];

  for (let i = 0; i < RIDERS.length; i++) {
    const r = RIDERS[i];
    try {
      // Create customer account
      const customerId = await upsertCustomer({
        email: r.email,
        first_name: r.name.split(" ")[0],
        last_name: r.name.split(" ").slice(1).join(" ") || "Rider",
        phone: r.phone,
        password: "Rider@123!",
      });

      // Assign to rider group
      await assignCustomerGroup(customerId, riderGroupId);

      // Check if Driver record already exists
      const existingDrivers = await deliveryService.listDrivers({ user_id: [customerId] }).catch(() => []);
      let driverId: string;

      if (existingDrivers.length > 0) {
        driverId = existingDrivers[0].id;
      } else {
        // Create Driver record
        const [driver] = await deliveryService.createDrivers([{
          name: r.name,
          phone: r.phone,
          vehicle_type: vehicleTypeMap[r.vehicle] || "bike",
          vehicle_number: r.vehicle_number,
          user_id: customerId,
          zone_id: zoneId,
          upi_vpa: r.upi,
          status: "offline",
          last_lat: ROHTAK_LAT + (Math.random() - 0.5) * 0.05,
          last_lng: ROHTAK_LNG + (Math.random() - 0.5) * 0.05,
          metadata: {
            vehicle_type_display: r.vehicle,
            demo: true,
          },
        }]);
        driverId = driver.id;
      }

      riderResults.push({ email: r.email, driverId });
      logger.info(`   ✓ ${r.name} — ${r.email} (Driver: ${driverId})`);
    } catch (err: any) {
      logger.warn(`   ✗ ${r.name}: ${err.message}`);
    }
  }

  // ── 11. Create 5 Demo Customers ──────────────────────────────────────────────
  logger.info("11. Creating 5 demo customers...");

  // Create customer group
  const { rows: existingCustGroup } = await pool.query(
    `SELECT id FROM customer_group WHERE name = 'Demo Customers' AND deleted_at IS NULL LIMIT 1`
  );
  let customerGroupId: string;
  if (existingCustGroup.length > 0) {
    customerGroupId = existingCustGroup[0].id;
  } else {
    customerGroupId = `cg_customers_${Date.now()}`;
    await pool.query(
      `INSERT INTO customer_group (id, name, metadata, created_at, updated_at)
       VALUES ($1, 'Demo Customers', $2::jsonb, NOW(), NOW())`,
      [customerGroupId, JSON.stringify({ type: "customer" })]
    );
  }

  const customerResults: Array<{ email: string; id: string }> = [];

  for (const c of CUSTOMERS) {
    try {
      const id = await upsertCustomer({
        ...c,
        password: "Customer@123!",
      });
      await assignCustomerGroup(id, customerGroupId);
      customerResults.push({ email: c.email, id });
      logger.info(`   ✓ ${c.first_name} ${c.last_name} — ${c.email}`);
    } catch (err: any) {
      logger.warn(`   ✗ ${c.email}: ${err.message}`);
    }
  }

  // ── 12. Summary ─────────────────────────────────────────────────────────────
  logger.info("");
  logger.info("════════════════════════════════════════════════════════");
  logger.info("  E2E DEMO SEED COMPLETE");
  logger.info("════════════════════════════════════════════════════════");
  logger.info(`  Maa ki Rasoi Channel: ${maaKiRasoiChannelId}`);
  logger.info(`  API Key:              ${apiKey.token}`);
  logger.info(`  Service Zone:         ${zoneId}`);
  logger.info(`  Dishes created:       ${createdProducts.length}`);
  logger.info(`  Riders:               ${riderResults.length}`);
  logger.info(`  Customers:            ${customerResults.length}`);
  logger.info("");
  logger.info("  SELLER LOGIN");
  logger.info("    Email:    mkr.seller@digitalrohtak.test");
  logger.info("    Password: MKRseller@123");
  logger.info("");
  logger.info("  RIDER LOGIN (any of 10, password: Rider@123!)");
  for (const r of riderResults) {
    logger.info(`    ${r.email}`);
  }
  logger.info("");
  logger.info("  CUSTOMER LOGIN (any of 5, password: Customer@123!)");
  for (const c of customerResults) {
    logger.info(`    ${c.email}`);
  }
  logger.info("");
  logger.info("  DELIVERY ADDRESS (E2E test)");
  logger.info(`    ${DELIVERY_ADDRESS}`);
  logger.info(`    GPS: ${DELIVERY_LAT}, ${DELIVERY_LNG}`);
  logger.info("════════════════════════════════════════════════════════");

  await pool.end();
}
