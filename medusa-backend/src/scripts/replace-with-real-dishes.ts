/**
 * Replace all fake ingredient-combination dishes with REAL authentic dishes
 * from Indian restaurants, street food, and global cuisines.
 * 
 * Usage: npx medusa exec ./src/scripts/replace-with-real-dishes.ts
 */

import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import { createProductsWorkflow, createInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows";

// Authentic dishes organized by cuisine and category
const AUTHENTIC_DISHES = {
  // NORTH INDIAN
  northIndian: {
    breads: [
      "Aloo Paratha", "Gobi Paratha", "Paneer Paratha", "Mooli Paratha", "Pyaaz Paratha",
      "Aloo Pyaaz Paratha", "Plain Paratha", "Laccha Paratha", "Pudina Paratha", "Methi Paratha",
      "Roti", "Tandoori Roti", "Butter Roti", "Naan", "Butter Naan", "Garlic Naan",
      "Cheese Naan", "Kulcha", "Amritsari Kulcha", "Puri", "Bhatura", "Makki Di Roti"
    ],
    rice: [
      "Jeera Rice", "Steamed Rice", "Pulao", "Veg Pulao", "Peas Pulao",
      "Biryani", "Veg Biryani", "Chicken Biryani", "Mutton Biryani",
      "Hyderabadi Biryani", "Lucknowi Biryani", "Awadhi Biryani", "Egg Biryani"
    ],
    curries: [
      "Dal Tadka", "Dal Fry", "Dal Makhani", "Rajma", "Chole", "Kadhi Pakora",
      "Paneer Butter Masala", "Paneer Tikka Masala", "Palak Paneer", "Matar Paneer",
      "Shahi Paneer", "Kadai Paneer", "Butter Chicken", "Chicken Tikka Masala",
      "Chicken Curry", "Mutton Curry", "Rogan Josh", "Aloo Gobi", "Aloo Matar",
      "Mix Veg", "Baingan Bharta", "Bhindi Masala", "Dum Aloo", "Malai Kofta"
    ],
    starters: [
      "Samosa", "Aloo Tikki", "Pakora", "Paneer Tikka", "Chicken Tikka",
      "Tandoori Chicken", "Seekh Kebab", "Hara Bhara Kebab", "Papdi Chaat",
      "Aloo Chaat", "Dahi Bhalla", "Golgappa", "Pani Puri", "Bhel Puri",
      "Sev Puri", "Dahi Puri", "Raj Kachori"
    ]
  },

  // SOUTH INDIAN
  southIndian: {
    breakfast: [
      "Idli", "Medu Vada", "Sambar Vada", "Dahi Vada", "Masala Dosa", "Plain Dosa",
      "Onion Dosa", "Mysore Masala Dosa", "Rava Dosa", "Uttapam", "Onion Uttapam",
      "Tomato Uttapam", "Mix Veg Uttapam", "Pongal", "Upma", "Poha"
    ],
    rice: [
      "Sambar Rice", "Rasam Rice", "Curd Rice", "Lemon Rice", "Tamarind Rice",
      "Coconut Rice", "Tomato Rice", "Bisi Bele Bath"
    ],
    curries: [
      "Sambar", "Rasam", "Avial", "Kootu", "Poriyal", "Thoran", "Kerala Fish Curry",
      "Chettinad Chicken", "Andhra Chicken Curry", "Gongura Mutton"
    ]
  },

  // INDO-CHINESE
  indoChinese: {
    starters: [
      "Veg Manchurian", "Chicken Manchurian", "Gobi Manchurian", "Chilli Chicken",
      "Chilli Paneer", "Spring Roll", "Veg Spring Roll", "Chicken Spring Roll",
      "Veg Momos", "Chicken Momos", "Paneer Momos", "Fried Momos"
    ],
    rice: [
      "Veg Fried Rice", "Chicken Fried Rice", "Egg Fried Rice", "Schezwan Fried Rice",
      "Triple Schezwan Rice", "Hakka Noodles", "Veg Hakka Noodles", "Chicken Hakka Noodles",
      "Schezwan Noodles", "Chowmein", "Singapore Noodles"
    ]
  },

  // PUNJABI
  punjabi: [
    "Chole Bhature", "Sarson Da Saag", "Makki Di Roti", "Amritsari Kulcha",
    "Pindi Chole", "Aloo Paratha", "Lassi", "Butter Chicken", "Dal Makhani"
  ],

  // GUJARATI
  gujarati: [
    "Dhokla", "Khandvi", "Thepla", "Fafda", "Undhiyu", "Gujarati Kadhi",
    "Dal Dhokli", "Handvo", "Khakhra", "Methi Thepla"
  ],

  // MAHARASHTRIAN
  maharashtrian: [
    "Vada Pav", "Pav Bhaji", "Misal Pav", "Sabudana Khichdi", "Poha",
    "Batata Vada", "Puran Poli", "Modak", "Thalipeeth"
  ],

  // BENGALI
  bengali: [
    "Machher Jhol", "Shorshe Ilish", "Kosha Mangsho", "Chingri Malai Curry",
    "Aloo Posto", "Luchi", "Rasgulla", "Sandesh", "Mishti Doi"
  ],

  // RAJASTHANI
  rajasthani: [
    "Dal Baati Churma", "Gatte Ki Sabzi", "Ker Sangri", "Laal Maas",
    "Bajra Roti", "Pyaaz Kachori", "Mirchi Vada"
  ],

  // STREET FOOD
  streetFood: [
    "Pav Bhaji", "Vada Pav", "Dabeli", "Kachori", "Jalebi", "Rabri",
    "Kulfi", "Falooda", "Chaat", "Tikki", "Chole Kulche"
  ],

  // AMERICAN FAST FOOD
  american: [
    "Burger", "Cheese Burger", "Veg Burger", "Chicken Burger", "Aloo Tikki Burger",
    "French Fries", "Pizza", "Margherita Pizza", "Pepperoni Pizza", "Veg Pizza",
    "Chicken Pizza", "Hot Dog", "Sandwich", "Grilled Sandwich", "Club Sandwich",
    "Pasta", "White Sauce Pasta", "Red Sauce Pasta", "Mac and Cheese"
  ],

  // ITALIAN
  italian: [
    "Pizza Margherita", "Pasta Alfredo", "Pasta Arrabiata", "Spaghetti Bolognese",
    "Penne Pasta", "Lasagna", "Risotto", "Bruschetta", "Garlic Bread"
  ],

  // CHINESE (AUTHENTIC)
  chinese: [
    "Fried Rice", "Noodles", "Dim Sum", "Wonton Soup", "Hot and Sour Soup",
    "Kung Pao Chicken", "Sweet and Sour Chicken", "Peking Duck"
  ],

  // THAI
  thai: [
    "Pad Thai", "Green Curry", "Red Curry", "Tom Yum Soup", "Thai Fried Rice",
    "Massaman Curry", "Panang Curry", "Som Tam"
  ],

  // JAPANESE
  japanese: [
    "Sushi", "Ramen", "Tempura", "Teriyaki Chicken", "Miso Soup",
    "Udon Noodles", "Gyoza", "Katsu Curry"
  ],

  // KOREAN
  korean: [
    "Kimchi", "Bibimbap", "Korean Fried Chicken", "Bulgogi", "Japchae",
    "Tteokbokki", "Korean BBQ"
  ],

  // MIDDLE EASTERN
  middleEastern: [
    "Shawarma", "Falafel", "Hummus", "Kebab", "Pita Bread", "Baklava",
    "Tabbouleh", "Fattoush", "Kunafa"
  ],

  // MEXICAN
  mexican: [
    "Tacos", "Burrito", "Quesadilla", "Nachos", "Enchiladas", "Guacamole"
  ],

  // BEVERAGES
  beverages: [
    "Lassi", "Sweet Lassi", "Mango Lassi", "Salted Lassi", "Buttermilk",
    "Masala Chai", "Coffee", "Cold Coffee", "Fresh Lime Soda", "Fresh Lime Water",
    "Jaljeera", "Aam Panna", "Thandai", "Badam Milk", "Rose Milk"
  ],

  // DESSERTS
  desserts: [
    "Gulab Jamun", "Rasgulla", "Rasmalai", "Jalebi", "Kheer", "Gajar Halwa",
    "Moong Dal Halwa", "Kulfi", "Ice Cream", "Brownie", "Cake", "Pastry"
  ]
};

export default async function replaceWithRealDishes({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productService = container.resolve(Modules.PRODUCT);
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION);
  const fulfillmentService = container.resolve(Modules.FULFILLMENT);

  logger.info("🗑️  Step 1: Deleting ALL existing products in Maa-Ki-Rasoi...");
  
  const [salesChannel] = await salesChannelService.listSalesChannels({ name: "Maa-Ki-Rasoi" });
  if (!salesChannel) {
    logger.error("Sales channel 'Maa-Ki-Rasoi' not found");
    return;
  }

  const [stockLocation] = await stockLocationService.listStockLocations({ name: "Rohtak Warehouse" });
  if (!stockLocation) {
    logger.error("Stock location 'Rohtak Warehouse' not found");
    return;
  }

  const [shippingProfile] = await fulfillmentService.listShippingProfiles({ type: "default" });
  if (!shippingProfile) {
    logger.error("Default shipping profile not found");
    return;
  }

  // Get category mappings
  const { data: categoryRows } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  const categoryByName = new Map<string, string>();
  for (const c of categoryRows) categoryByName.set(c.name, c.id);

  // Delete all existing MKR products (soft delete)
  logger.info("Soft-deleting all existing products...");
  const existingProducts = await productService.listProducts(
    {},
    { select: ["id"], take: 100000 }
  );
  
  const productIds = existingProducts.map(p => p.id);
  if (productIds.length > 0) {
    await productService.softDeleteProducts(productIds);
  }
  logger.info(`Deleted ${productIds.length} existing products`);

  logger.info("🍽️  Step 2: Creating authentic dishes...");

  const allDishes: Array<{ name: string; category: string; cuisine: string }> = [];

  // North Indian
  AUTHENTIC_DISHES.northIndian.breads.forEach(name => 
    allDishes.push({ name, category: "Breads & Rice", cuisine: "North Indian" })
  );
  AUTHENTIC_DISHES.northIndian.rice.forEach(name => 
    allDishes.push({ name, category: "Breads & Rice", cuisine: "North Indian" })
  );
  AUTHENTIC_DISHES.northIndian.curries.forEach(name => 
    allDishes.push({ name, category: "Dal & Curries", cuisine: "North Indian" })
  );
  AUTHENTIC_DISHES.northIndian.starters.forEach(name => 
    allDishes.push({ name, category: "Starters & Snacks", cuisine: "North Indian" })
  );

  // South Indian
  AUTHENTIC_DISHES.southIndian.breakfast.forEach(name => 
    allDishes.push({ name, category: "Starters & Snacks", cuisine: "South Indian" })
  );
  AUTHENTIC_DISHES.southIndian.rice.forEach(name => 
    allDishes.push({ name, category: "Breads & Rice", cuisine: "South Indian" })
  );
  AUTHENTIC_DISHES.southIndian.curries.forEach(name => 
    allDishes.push({ name, category: "Dal & Curries", cuisine: "South Indian" })
  );

  // Indo-Chinese
  AUTHENTIC_DISHES.indoChinese.starters.forEach(name => 
    allDishes.push({ name, category: "Starters & Snacks", cuisine: "Indo-Chinese" })
  );
  AUTHENTIC_DISHES.indoChinese.rice.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Indo-Chinese" })
  );

  // Regional Indian
  AUTHENTIC_DISHES.punjabi.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Punjabi" })
  );
  AUTHENTIC_DISHES.gujarati.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Gujarati" })
  );
  AUTHENTIC_DISHES.maharashtrian.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Maharashtrian" })
  );
  AUTHENTIC_DISHES.bengali.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Bengali" })
  );
  AUTHENTIC_DISHES.rajasthani.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Rajasthani" })
  );
  AUTHENTIC_DISHES.streetFood.forEach(name => 
    allDishes.push({ name, category: "Starters & Snacks", cuisine: "Street Food" })
  );

  // International
  AUTHENTIC_DISHES.american.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "American" })
  );
  AUTHENTIC_DISHES.italian.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Italian" })
  );
  AUTHENTIC_DISHES.chinese.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Chinese" })
  );
  AUTHENTIC_DISHES.thai.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Thai" })
  );
  AUTHENTIC_DISHES.japanese.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Japanese" })
  );
  AUTHENTIC_DISHES.korean.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Korean" })
  );
  AUTHENTIC_DISHES.middleEastern.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Middle Eastern" })
  );
  AUTHENTIC_DISHES.mexican.forEach(name => 
    allDishes.push({ name, category: "Main Course", cuisine: "Mexican" })
  );

  // Beverages & Desserts
  AUTHENTIC_DISHES.beverages.forEach(name => 
    allDishes.push({ name, category: "Beverages", cuisine: "Indian" })
  );
  AUTHENTIC_DISHES.desserts.forEach(name => 
    allDishes.push({ name, category: "Desserts & Sweets", cuisine: "Indian" })
  );

  logger.info(`Total authentic dishes to create: ${allDishes.length}`);

  const batchSize = 100;
  let created = 0;

  for (let i = 0; i < allDishes.length; i += batchSize) {
    const batch = allDishes.slice(i, i + batchSize);
    const products = batch.map(dish => {
      const handle = dish.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const categoryId = categoryByName.get(dish.category);

      return {
        title: dish.name,
        handle,
        description: `Authentic ${dish.cuisine} dish - ${dish.name}`,
        status: ProductStatus.PUBLISHED,
        weight: 250,
        origin_country: "IN",
        discountable: true,
        shipping_profile_id: shippingProfile.id,
        category_ids: categoryId ? [categoryId] : [],
        metadata: {
          cuisine: dish.cuisine,
          category: dish.category,
        },
        options: [{ title: "Size", values: ["Regular"] }],
        variants: [{
          title: "Regular",
          sku: `MKR-${handle.toUpperCase().slice(0, 40)}`,
          manage_inventory: true,
          allow_backorder: false,
          weight: 250,
          options: { Size: "Regular" },
          prices: [{ amount: 99, currency_code: "inr" }],
        }],
        sales_channels: [{ id: salesChannel.id }],
      };
    });

    const { result } = await createProductsWorkflow(container).run({ input: { products } });
    created += result.length;

    // Add inventory
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
            inventory_levels: inventoryItemIds.map(inventory_item_id => ({
              location_id: stockLocation.id,
              inventory_item_id,
              stocked_quantity: 1000,
            })),
          },
        });
      }
    }

    logger.info(`Created ${created}/${allDishes.length} dishes...`);
  }

  logger.info("✅ Complete!");
  logger.info(`Total authentic dishes created: ${created}`);
  logger.info("All dishes are real, authentic items from Indian and global cuisines");
}
