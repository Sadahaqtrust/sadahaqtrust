import { model } from "@medusajs/framework/utils";

export const MerchantConfig = model.define("upi_merchant_config", {
  id: model.id().primaryKey(),
  merchant_upi_id: model.text(),
  merchant_upi_name: model.text(),
  is_active: model.boolean().default(true),
});
