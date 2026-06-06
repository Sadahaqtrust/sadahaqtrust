/**
 * Bulk import 111,000 Maa-Ki-Rasoi dishes from food-dishes-database CSV
 * directly into Medusa (no admin UI, no CSV upload timeouts).
 *
 * Usage:
 *   npx medusa exec ./src/scripts/import-mkr-dishes.ts
 *
 * Optional env:
 *   MKR_CSV_PATH         absolute path to the source CSV (defaults to the one
 *                        in food-dishes-database/output/medusa_products_import.csv)
 *   MKR_BATCH_SIZE       products per workflow run (default 250)
 *   MKR_PROGRESS_EVERY   log every N batches (default 4)
 *   MKR_START_FROM       zero-indexed row to resume from (default 0)
 *   MKR_LIMIT            max rows to import (default all)
 *
 * Side effects:
 *   - Creates products attached to the Maa-Ki-Rasoi sales channel.
 *   - Maps each row's Category Name to an existing product category.
 *   - Adds an INR price of 999 (major units).
 *   - Marks products published so they show in the storefront.
 *   - Seeds inventory levels of 1,000,000 at Rohtak Warehouse for new items.
 *   - Idempotent per handle: rows whose handle already exists are skipped.
 */
import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

const DEFAULT_CSV_PATH = path.resolve(
  process.cwd(),
  "../Digitalrohtak_madusa/Digitalrohtak_madusa/food-dishes-database/output/medusa_products_import.csv"
);

type SourceRow = {
  "Product Handle": string;
  "Product Title": string;
  "Product Description": string;
  "Product Status": string;
  "Product Weight": string;
  "Product Origin Country": string;
  "Category Name": string;
  "Sales Channel 1 Name": string;
  "Variant Title": string;
  "Variant SKU": string;
  "Variant Price INR": string;
  "Option 1 Name": string;
  "Option 1 Value": string;
  "Metadata fssai_category": string;
  "Metadata veg_nonveg": string;
  "Metadata allergens": string;
  "Metadata serving_size": string;
  "Metadata preparation_time_mins": string;
  "Metadata cooking_method": string;
  "Metadata cuisine_origin": string;
  "Metadata primary_ingredients": string;
  "Metadata google_business_category": string;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ",") {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}

async function* readRows(csvPath: string): AsyncGenerator<SourceRow> {
  const stream = fs.createReadStream(csvPath, { encoding: "utf-8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let header: string[] | null = null;
  let buffer = "";
  let openQuotes = 0;

  const processLogicalLine = (logicalLine: string): SourceRow | null => {
    const cells = parseCsvLine(logicalLine);
    if (!header) {
      header = cells;
      return null;
    }
    const row: Record<string, string> = {};
    for (let i = 0; i < header.length; i++) {
      row[header[i]] = (cells[i] ?? "").trim();
    }
    return row as SourceRow;
  };

  for await (const rawLine of rl) {
    // handle fields containing embedded newlines by tracking unbalanced quotes
    const quotes = (rawLine.match(/"/g) || []).length;
    if (openQuotes === 0) {
      if (quotes % 2 === 0) {
        const row = processLogicalLine(rawLine);
        if (row) yield row;
      } else {
        buffer = rawLine;
        openQuotes = 1;
      }
    } else {
      buffer += "\n" + rawLine;
      if (quotes % 2 === 1) {
        const row = processLogicalLine(buffer);
        openQuotes = 0;
        buffer = "";
        if (row) yield row;
      }
    }
  }
  if (buffer && openQuotes === 0) {
    const row = processLogicalLine(buffer);
    if (row) yield row;
  }
}

function toInt(s: string, fallback = 0): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

const VALID_COUNTRY_CODES = new Set([
  "au","bd","br","cn","de","eg","es","et","fr","gb","gr","id","in","ir","it",
  "jm","jp","kr","lb","lk","ma","mx","my","ng","np","pe","ph","pk","pl","ru",
  "th","tr","us","vn","cu","ar",
]);

export default async function importMkrDishes({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION);
  const fulfillmentService = container.resolve(Modules.FULFILLMENT);
  const productService = container.resolve(Modules.PRODUCT);

  const csvPath = process.env.MKR_CSV_PATH || DEFAULT_CSV_PATH;
  const batchSize = toInt(process.env.MKR_BATCH_SIZE || "", 250);
  const progressEvery = toInt(process.env.MKR_PROGRESS_EVERY || "", 4);
  const startFrom = toInt(process.env.MKR_START_FROM || "", 0);
  const limit = toInt(process.env.MKR_LIMIT || "", 0); // 0 = no limit

  if (!fs.existsSync(csvPath)) {
    logger.error(`CSV not found: ${csvPath}`);
    return;
  }
  logger.info(`Reading: ${csvPath}`);
  logger.info(
    `batchSize=${batchSize} startFrom=${startFrom} limit=${limit || "all"}`
  );

  // Prerequisites
  const [salesChannel] = await salesChannelService.listSalesChannels({
    name: "Maa-Ki-Rasoi",
  });
  if (!salesChannel) {
    logger.error("Sales channel 'Maa-Ki-Rasoi' not found. Run seed-maa-ki-rasoi first.");
    return;
  }
  const [stockLocation] = await stockLocationService.listStockLocations({
    name: "Rohtak Warehouse",
  });
  if (!stockLocation) {
    logger.error("Stock location 'Rohtak Warehouse' not found. Run seed-india first.");
    return;
  }
  const [shippingProfile] = await fulfillmentService.listShippingProfiles({
    type: "default",
  });
  if (!shippingProfile) {
    logger.error("Default shipping profile not found.");
    return;
  }

  const { data: categoryRows } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  const categoryByName = new Map<string, string>();
  for (const c of categoryRows) categoryByName.set(c.name, c.id);
  const missingCategoryNames = new Set<string>();

  // load existing handles so we can resume safely
  logger.info("Loading existing product handles for idempotency ...");
  const existingHandles = new Set<string>();
  {
    const pageSize = 5000;
    let offset = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await productService.listProducts(
        {},
        { select: ["handle"], take: pageSize, skip: offset }
      );
      for (const p of page) if (p.handle) existingHandles.add(p.handle);
      if (page.length < pageSize) break;
      offset += pageSize;
    }
  }
  logger.info(`Existing product handles: ${existingHandles.size}`);

  const channelId = salesChannel.id;
  const locationId = stockLocation.id;
  const shippingProfileId = shippingProfile.id;

  let totalSeen = 0;
  let totalSkipped = 0;
  let totalCreated = 0;
  let batchNumber = 0;
  const startedAt = Date.now();

  const pending: any[] = [];

  async function flush(reason: string) {
    if (pending.length === 0) return;
    batchNumber++;
    const size = pending.length;
    const t0 = Date.now();
    try {
      const { result } = await createProductsWorkflow(container).run({
        input: { products: pending.splice(0, pending.length) },
      });
      totalCreated += result.length;
      // hydrate inventory for new variants (1,000,000 per variant)
      const variantIds: string[] = [];
      for (const p of result) {
        for (const v of p.variants ?? []) variantIds.push(v.id);
      }
      if (variantIds.length > 0) {
        const { data: invItems } = await query.graph({
          entity: "product_variant",
          fields: ["id", "inventory_items.inventory.id"],
          filters: { id: variantIds },
        });
        const inventoryItemIds: string[] = [];
        for (const v of invItems) {
          for (const link of v.inventory_items ?? []) {
            const id = link?.inventory?.id;
            if (id) inventoryItemIds.push(id);
          }
        }
        if (inventoryItemIds.length > 0) {
          await createInventoryLevelsWorkflow(container).run({
            input: {
              inventory_levels: inventoryItemIds.map((inventory_item_id) => ({
                location_id: locationId,
                inventory_item_id,
                stocked_quantity: 1_000_000,
              })),
            },
          });
        }
      }
    } catch (err: any) {
      logger.error(`Batch ${batchNumber} failed (${reason}, size=${size}): ${err?.message || err}`);
      throw err;
    }
    const dt = Date.now() - t0;
    if (batchNumber % progressEvery === 0) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      const rate = totalCreated / Math.max(1, (Date.now() - startedAt) / 1000);
      logger.info(
        `batch ${batchNumber} ok (${size} in ${dt}ms) | seen=${totalSeen} created=${totalCreated} skipped=${totalSkipped} elapsed=${elapsed}s rate=${rate.toFixed(1)}/s`
      );
    }
  }

  for await (const row of readRows(csvPath)) {
    totalSeen++;
    if (totalSeen <= startFrom) continue;
    if (limit && totalSeen - startFrom > limit) break;

    const handle = row["Product Handle"];
    if (!handle) {
      totalSkipped++;
      continue;
    }
    if (existingHandles.has(handle)) {
      totalSkipped++;
      continue;
    }
    existingHandles.add(handle);

    const categoryName = row["Category Name"] || "Main Course";
    const categoryId = categoryByName.get(categoryName);
    if (!categoryId) missingCategoryNames.add(categoryName);

    const origin = (row["Product Origin Country"] || "IN").toLowerCase();
    const originCountry = VALID_COUNTRY_CODES.has(origin) ? origin.toUpperCase() : "IN";

    const weight = toInt(row["Product Weight"], 250);
    const price = toInt(row["Variant Price INR"], 999);

    const metadata: Record<string, string> = {};
    for (const k of Object.keys(row)) {
      if (k.startsWith("Metadata ") && row[k as keyof SourceRow]) {
        metadata[k.replace("Metadata ", "")] = row[k as keyof SourceRow] as string;
      }
    }

    const title = row["Product Title"] || handle;
    const sku = row["Variant SKU"] || `MKR-${handle}`.toUpperCase().slice(0, 60);
    const optionName = row["Option 1 Name"] || "Size";
    const optionValue = row["Option 1 Value"] || "Regular";

    pending.push({
      title,
      handle,
      description: row["Product Description"] || title,
      status: ProductStatus.PUBLISHED,
      weight,
      origin_country: originCountry,
      discountable: true,
      shipping_profile_id: shippingProfileId,
      category_ids: categoryId ? [categoryId] : [],
      metadata,
      options: [{ title: optionName, values: [optionValue] }],
      variants: [
        {
          title: row["Variant Title"] || optionValue,
          sku,
          manage_inventory: true,
          allow_backorder: false,
          weight,
          options: { [optionName]: optionValue },
          prices: [{ amount: price, currency_code: "inr" }],
        },
      ],
      sales_channels: [{ id: channelId }],
    });

    if (pending.length >= batchSize) {
      await flush("size");
    }
  }
  await flush("final");

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  logger.info("──────────────────────────────────────────────────────");
  logger.info(`Import finished in ${elapsedSec}s`);
  logger.info(`rows_seen       : ${totalSeen}`);
  logger.info(`created         : ${totalCreated}`);
  logger.info(`skipped_existing: ${totalSkipped}`);
  if (missingCategoryNames.size > 0) {
    logger.warn(
      `unmapped category names: ${Array.from(missingCategoryNames).join(", ")}`
    );
  }
  logger.info("──────────────────────────────────────────────────────");
}
