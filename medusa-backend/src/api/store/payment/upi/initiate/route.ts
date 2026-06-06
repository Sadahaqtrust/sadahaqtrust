import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import { UPI_MODULE } from "../../../../../modules/upi";
import { checkAdminAuth, isTestMode, getClientIP, auditUPI } from "../../../../../modules/upi/security";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ip = getClientIP(req);

  // Admin only
  const auth = await checkAdminAuth(req);
  if (!auth.allowed) {
    auditUPI("INITIATE_DENIED", { reason: auth.reason, ip }, ip);
    return res.status(403).json({ error: auth.reason || "Forbidden" });
  }

  const { cart_id, requires_delivery, rider_upi_id, rider_upi_name } = req.body as any;
  if (!cart_id) return res.status(400).json({ error: "cart_id is required" });

  // Validate rider VPA format if delivery
  if (requires_delivery && rider_upi_id) {
    const vpaRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    if (!vpaRegex.test(rider_upi_id)) {
      return res.status(400).json({ error: "Invalid rider UPI ID format" });
    }
    // Prevent same VPA as merchant
    const merchantVPA = (process.env.MERCHANT_UPI_ID || "").toLowerCase();
    if (rider_upi_id.toLowerCase() === merchantVPA) {
      return res.status(400).json({ error: "Rider UPI ID cannot be same as merchant UPI ID" });
    }
  }

  const cartService = req.scope.resolve(Modules.CART);
  const cart = await cartService.retrieveCart(cart_id, { relations: ["items", "shipping_methods"] });
  if (!cart) return res.status(404).json({ error: "Cart not found" });

  if ((cart as any).completed_at) {
    return res.status(400).json({ error: "Cart already completed" });
  }

  // Fetch computed totals via store API
  const MEDUSA_URL = process.env.MEDUSA_INTERNAL_URL || "http://127.0.0.1:9000";
  const PUB_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";
  const cartRes = await fetch(`${MEDUSA_URL}/store/carts/${cart_id}`, {
    headers: { "x-publishable-api-key": PUB_KEY },
  });
  const cartData = await cartRes.json();
  const computedCart = cartData.cart || cart;

  const merchant_amount = Number((((computedCart as any).item_total || (computedCart as any).total || 0) / 100).toFixed(2));
  const shipping_total = Number((((computedCart as any).shipping_total || 0) / 100).toFixed(2));

  if (merchant_amount <= 0) {
    return res.status(400).json({ error: "Cart amount must be greater than zero" });
  }

  const merchant_upi_id = process.env.MERCHANT_UPI_ID || "merchant@upi";
  const merchant_upi_name = process.env.MERCHANT_UPI_NAME || "Digital Rohtak";

  const upiService = req.scope.resolve(UPI_MODULE);

  // Prevent duplicate — upsert by cart_id
  const existing = await upiService.listUpiPayments({ cart_id });
  if (existing.length > 0 && existing[0].merchant_payment_status === "captured") {
    return res.status(400).json({ error: "Payment already captured for this cart" });
  }

  const merchant_intent = `upi://pay?pa=${merchant_upi_id}&pn=${encodeURIComponent(merchant_upi_name)}&am=${merchant_amount}&tr=${cart_id}_M&cu=INR`;
  const rider_intent = (requires_delivery && rider_upi_id)
    ? `upi://pay?pa=${rider_upi_id}&pn=${encodeURIComponent(rider_upi_name || "Rider")}&am=${shipping_total}&tr=${cart_id}_R&cu=INR`
    : null;

  if (existing.length === 0) {
    await upiService.createUpiPayments({
      cart_id,
      merchant_upi_id,
      merchant_upi_name,
      merchant_amount,
      rider_upi_id: rider_upi_id || null,
      rider_upi_name: rider_upi_name || null,
      rider_amount: requires_delivery ? shipping_total : null,
      requires_delivery: !!requires_delivery,
      merchant_payment_status: "pending",
      rider_payment_status: requires_delivery ? "pending" : "not_applicable",
    });
  }

  auditUPI("INITIATE_SUCCESS", {
    cart_id, merchant_upi_id, merchant_amount,
    requires_delivery, rider_upi_id: rider_upi_id || null,
    admin: auth.email, test_mode: isTestMode(),
  }, ip);

  return res.json({
    merchant_intent,
    rider_intent,
    merchant_amount,
    rider_amount: requires_delivery ? shipping_total : 0,
    merchant_upi_id,
    test_mode: isTestMode(),
  });
}
