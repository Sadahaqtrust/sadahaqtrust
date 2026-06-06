import { Module } from "@medusajs/framework/utils"
import BarterWalletModuleService from "./services/barter-wallet-module-service"

export const BARTER_WALLET_MODULE = "barterWalletModuleService"

export default Module(BARTER_WALLET_MODULE, {
  service: BarterWalletModuleService,
})

export { Wallet } from "./models/wallet"
export { Transaction } from "./models/transaction"
export { default as BarterWalletModuleService } from "./services/barter-wallet-module-service"
