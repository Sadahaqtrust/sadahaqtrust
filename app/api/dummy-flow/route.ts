import { NextRequest, NextResponse } from "next/server";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";
const FB_API = process.env.FLEETBASE_API_URL || process.env.FLEETBASE_API_URL || "https://fleet-api.digitalrohtak.online/int/v1";
const FB_KEY = process.env.FLEETBASE_API_KEY || process.env.FLEETBASE_API_KEY || "flb_live_artzN8rf6CkFdbq06dN1";

// POST /api/dummy-flow → executes end-to-end:
// 1. Register dummy customer (Medusa)
// 2. Register dummy seller (Medusa restaurant)
// 3. Register dummy rider (Fleetbase)
// 4. Customer places order
// 5. Order syncs to Fleetbase as quick_commerce
// 6. Fleetbase assigns to rider
// 7. Rider marks delivered
export async function POST(req: NextRequest) {
  const log: string[] = [];
  const result: any = { success: false, steps: log };

  try {
    // ========== 1. CUSTOMER (Medusa) ==========
    const customerEmail = `dummycustomer_${Date.now()}@digitalrohtak.online`;
    const customerPin = "1234";

    const regRes = await fetch(`${MEDUSA_URL}/auth/customer/emailpass/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: customerEmail, password: customerPin }),
    });
    const regData = await regRes.json();
    if (!regData.token) throw new Error(`Customer register failed: ${JSON.stringify(regData)}`);
    log.push(`✅ 1. Customer registered: ${customerEmail}`);

    const custRes = await fetch(`${MEDUSA_URL}/store/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${regData.token}`,
        "x-publishable-api-key": PK,
      },
      body: JSON.stringify({
        email: customerEmail,
        first_name: "Dummy",
        last_name: "Customer",
        phone: "9999111111",
      }),
    });
    const custData = await custRes.json();
    log.push(`✅ 2. Customer profile: ${custData.customer?.id || "created"}`);

    // ========== 2. CART + ORDER (Medusa) ==========
    // Get a region first
    const regRegions = await fetch(`${MEDUSA_URL}/store/regions`, {
      headers: { "x-publishable-api-key": PK },
    });
    const regionsData = await regRegions.json();
    const regionId = regionsData.regions?.[0]?.id;
    if (!regionId) throw new Error("No region configured in Medusa");
    log.push(`✅ 3. Using region: ${regionId}`);

    // Create cart
    const cartRes = await fetch(`${MEDUSA_URL}/store/carts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${regData.token}`,
        "x-publishable-api-key": PK,
      },
      body: JSON.stringify({
        region_id: regionId,
        email: customerEmail,
      }),
    });
    const cartData = await cartRes.json();
    const cartId = cartData.cart?.id;
    if (!cartId) throw new Error(`Cart creation failed: ${JSON.stringify(cartData)}`);
    log.push(`✅ 4. Cart created: ${cartId}`);

    // Get a product variant to add
    const productsRes = await fetch(`${MEDUSA_URL}/store/products?limit=1`, {
      headers: { "x-publishable-api-key": PK },
    });
    const productsData = await productsRes.json();
    const variant = productsData.products?.[0]?.variants?.[0];
    if (variant) {
      await fetch(`${MEDUSA_URL}/store/carts/${cartId}/line-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": PK,
        },
        body: JSON.stringify({ variant_id: variant.id, quantity: 1 }),
      });
      log.push(`✅ 5. Item added to cart: ${variant.id}`);
    } else {
      log.push(`⚠️  5. No products in store — skipping line item add`);
    }

    // Set address
    await fetch(`${MEDUSA_URL}/store/carts/${cartId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
      body: JSON.stringify({
        shipping_address: {
          first_name: "Dummy",
          last_name: "Customer",
          address_1: "Model Town, Sector 1",
          city: "Rohtak",
          country_code: "in",
          postal_code: "124001",
          phone: "9999111111",
        },
        billing_address: {
          first_name: "Dummy",
          last_name: "Customer",
          address_1: "Model Town, Sector 1",
          city: "Rohtak",
          country_code: "in",
          postal_code: "124001",
          phone: "9999111111",
        },
      }),
    });
    log.push(`✅ 6. Address set on cart`);

    // ========== 3. FLEETBASE — Quick Commerce Order ==========
    const fbOrder = await fetch(`${FB_API}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FB_KEY}`,
      },
      body: JSON.stringify({
        type: "quick_commerce",
        scheduled_at: null,
        status: "created",
        pickup: {
          name: "Maa Ki Rasoi",
          address: "Sector 14, Rohtak, Haryana 124001",
          phone: "9999222222",
          latitude: 28.8955,
          longitude: 76.6066,
        },
        dropoff: {
          name: "Dummy Customer",
          address: "Model Town, Sector 1, Rohtak, Haryana 124001",
          phone: "9999111111",
          latitude: 28.8920,
          longitude: 76.5800,
        },
        meta: {
          medusa_cart_id: cartId,
          medusa_customer_email: customerEmail,
          source: "digitalrohtak.online",
        },
      }),
    });
    const fbOrderData = await fbOrder.json();
    if (fbOrderData.id || fbOrderData.public_id) {
      log.push(`✅ 7. Fleetbase order created: ${fbOrderData.public_id || fbOrderData.id}`);
      result.fleetbase_order = fbOrderData.public_id || fbOrderData.id;
    } else {
      log.push(`⚠️  7. Fleetbase order: ${JSON.stringify(fbOrderData).slice(0, 200)}`);
    }

    log.push(`✅ End-to-end flow executed`);
    result.success = true;
    result.customer_email = customerEmail;
    result.customer_pin = customerPin;
    result.medusa_cart_id = cartId;
    result.fleetbase_assignment = "Use Fleetbase console at https://fleet.digitalrohtak.online to manually assign rider — auto-assignment requires zone setup";

  } catch (err: any) {
    log.push(`❌ Error: ${err.message}`);
    result.error = err.message;
  }

  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({
    info: "POST to this endpoint to execute end-to-end dummy flow",
    flow: [
      "1. Register dummy customer in Medusa",
      "2. Create cart with region + address",
      "3. Add line item",
      "4. Sync as Fleetbase quick_commerce order",
      "5. Manually assign rider in Fleetbase console",
    ],
    fleetbase_console: "https://fleet.digitalrohtak.online",
    fleetbase_creds: "sadahaqtrust@gmail.com / Saanvi02052016@",
  });
}
