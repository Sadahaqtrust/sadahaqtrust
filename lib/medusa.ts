const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

const headers = {
  "Content-Type": "application/json",
  "x-publishable-api-key": PUBLISHABLE_KEY,
};

export async function getProducts() {
  const res = await fetch(`${MEDUSA_URL}/store/products`, {
    headers,
    cache: "no-store",
  });
  const data = await res.json();
  return data.products || [];
}

export async function getProduct(id: string) {
  const res = await fetch(`${MEDUSA_URL}/store/products/${id}`, {
    headers,
    cache: "no-store",
  });
  const data = await res.json();
  return data.product || null;
}

export async function createCart() {
  const res = await fetch(`${MEDUSA_URL}/store/carts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ region_id: "reg_01KQWNSTAGQKVSV63B12QMC5EJ" }),
  });
  const data = await res.json();
  return data.cart;
}

export async function addToCart(cartId: string, variantId: string, quantity: number = 1) {
  const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ variant_id: variantId, quantity }),
  });
  const data = await res.json();
  return res.ok ? data.cart : null;
}

export async function getCart(cartId: string) {
  const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.cart || null;
}

export async function removeFromCart(cartId: string, lineItemId: string) {
  const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}/line-items/${lineItemId}`, {
    method: "DELETE",
    headers,
  });
  const data = await res.json();
  return data.cart;
}
