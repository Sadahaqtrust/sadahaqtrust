import { model } from "@medusajs/framework/utils"

/**
 * CurrencyConfig - Platform-level configuration for the digital currency.
 * Controls issuance, limits, and governance rules.
 */
export const CurrencyConfig = model.define("barter_currency_config", {
  id: model.id().primaryKey(),
  config_key: model.text(),
  config_value: model.text(),
  description: model.text().nullable(),
  is_active: model.boolean().default(true),
})
