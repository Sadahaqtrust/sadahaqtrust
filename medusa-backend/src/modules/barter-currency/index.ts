import { Module } from "@medusajs/framework/utils"
import BarterCurrencyModuleService from "./services/barter-currency-module-service"

export const BARTER_CURRENCY_MODULE = "barterCurrencyModuleService"

export default Module(BARTER_CURRENCY_MODULE, {
  service: BarterCurrencyModuleService,
})

export { CurrencyAccount } from "./models/currency-account"
export { CreditLine } from "./models/credit-line"
export { CurrencyTransfer } from "./models/currency-transfer"
export { CurrencyConfig } from "./models/currency-config"
export { default as BarterCurrencyModuleService } from "./services/barter-currency-module-service"
