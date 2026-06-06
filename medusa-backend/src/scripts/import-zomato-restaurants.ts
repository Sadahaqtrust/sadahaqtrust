/**
 * Import restaurants from Zomato Rohtak into Medusa as Sales Channels
 * 
 * Usage: npx medusa exec ./src/scripts/import-zomato-restaurants.ts
 */

import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createSalesChannelsWorkflow } from "@medusajs/medusa/core-flows";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface ZomatoRestaurant {
  name: string;
  cuisine: string;
  address?: string;
  rating?: string;
  image?: string;
}

async function fetchZomatoRestaurants(): Promise<ZomatoRestaurant[]> {
  const url = "https://www.zomato.com/rohtak/restaurants?category=1";
  
  const curlCmd = `curl -s "${url}" \\
    -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \\
    -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"`;
  
  const { stdout } = await execAsync(curlCmd);
  
  // Extract JSON-LD structured data
  const scriptMatches = stdout.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs);
  const restaurants: ZomatoRestaurant[] = [];
  
  for (const match of scriptMatches) {
    try {
      const data = JSON.parse(match[1]);
      if (data['@type'] === 'ItemList' && data.itemListElement) {
        for (const item of data.itemListElement) {
          const restaurant = item.item;
          if (restaurant && restaurant['@type'] === 'Restaurant') {
            restaurants.push({
              name: restaurant.name,
              cuisine: restaurant.servesCuisine || '',
              address: restaurant.address?.streetAddress || '',
              rating: restaurant.aggregateRating?.ratingValue || '',
              image: restaurant.image || ''
            });
          }
        }
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }
  
  return restaurants;
}

export default async function importZomatoRestaurants({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);
  
  logger.info("Fetching restaurants from Zomato Rohtak...");
  const restaurants = await fetchZomatoRestaurants();
  logger.info(`Found ${restaurants.length} restaurants`);
  
  if (restaurants.length === 0) {
    logger.error("No restaurants found. Check if Zomato page structure changed.");
    return;
  }
  
  // Check existing sales channels
  const existingChannels = await salesChannelService.listSalesChannels({});
  const existingNames = new Set(existingChannels.map(c => c.name));
  
  const newRestaurants = restaurants.filter(r => !existingNames.has(r.name));
  logger.info(`${newRestaurants.length} new restaurants to import`);
  
  if (newRestaurants.length === 0) {
    logger.info("All restaurants already exist");
    return;
  }
  
  // Create sales channels in batches
  const batchSize = 10;
  let created = 0;
  
  for (let i = 0; i < newRestaurants.length; i += batchSize) {
    const batch = newRestaurants.slice(i, i + batchSize);
    
    const salesChannelsData = batch.map(restaurant => ({
      name: restaurant.name,
      description: `${restaurant.cuisine} - ${restaurant.address || 'Rohtak'}`,
      is_disabled: false,
      metadata: {
        source: 'zomato',
        cuisine: restaurant.cuisine,
        address: restaurant.address || '',
        rating: restaurant.rating || '',
        image: restaurant.image || '',
        city: 'Rohtak',
        state: 'Haryana',
        country: 'India'
      }
    }));
    
    try {
      await createSalesChannelsWorkflow(container).run({
        input: { salesChannelsData }
      });
      created += batch.length;
      logger.info(`Created ${created}/${newRestaurants.length} restaurants...`);
    } catch (error: any) {
      logger.error(`Failed to create batch: ${error.message}`);
    }
  }
  
  logger.info("─────────────────────────────────────────────────────");
  logger.info(`Import complete: ${created} restaurants added to Medusa`);
  logger.info("─────────────────────────────────────────────────────");
}
