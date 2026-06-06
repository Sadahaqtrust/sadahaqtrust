import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { action, lat, lng } = req.query as { action?: string; lat?: string; lng?: string };

  if (action === "fulfillment-options") {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeSlots: Array<{ label: string; value: string }> = [];
    if (now.getHours() < 18) {
      for (const h of [10, 12, 14, 16, 18, 20]) {
        if (h > now.getHours() + 2) {
          const slot = new Date(now);
          slot.setHours(h, 0, 0, 0);
          timeSlots.push({ label: `Today ${h}:00 - ${h + 2}:00`, value: slot.toISOString() });
        }
      }
    }
    for (const h of [9, 11, 13, 15, 17, 19]) {
      const slot = new Date(tomorrow);
      slot.setHours(h, 0, 0, 0);
      timeSlots.push({ label: `Tomorrow ${h}:00 - ${h + 2}:00`, value: slot.toISOString() });
    }

    return res.json({
      fulfillment_options: [
        {
          type: "quick_commerce",
          label_hi: "तुरंत डिलीवरी",
          label_en: "Quick Delivery",
          description_hi: "30-60 मिनट में डिलीवरी",
          description_en: "Delivery in 30-60 minutes",
          icon: "⚡",
          available: true,
          eta_minutes: 45,
          extra_charge: 0,
        },
        {
          type: "scheduled",
          label_hi: "समय निर्धारित डिलीवरी",
          label_en: "Scheduled Delivery",
          description_hi: "अपनी सुविधा अनुसार समय चुनें",
          description_en: "Choose your preferred time slot",
          icon: "📅",
          available: true,
          eta_minutes: null,
          extra_charge: 0,
          time_slots: timeSlots,
        },
        {
          type: "pickup",
          label_hi: "स्वयं उठाएं",
          label_en: "Self Pickup",
          description_hi: "हमारे स्टोर से स्वयं उठाएं",
          description_en: "Pick up from our store",
          icon: "🏪",
          available: true,
          eta_minutes: null,
          extra_charge: -20,
          pickup_address: {
            name: "Digital Rohtak Store",
            address: "Sector 1, Model Town, Rohtak, Haryana",
            timings: "9 AM - 9 PM",
          },
        },
      ],
    });
  }

  return res.sendStatus(200);
}
