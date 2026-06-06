import { Module } from "@medusajs/framework/utils";
import UpiModuleService from "./services/upi-module-service";
import { MerchantConfig } from "./models/merchant-config";
import { UpiPayment } from "./models/upi-payment";

export const UPI_MODULE = "upiModuleService";

export default Module(UPI_MODULE, { service: UpiModuleService });

export { MerchantConfig, UpiPayment };
export { default as UpiModuleService } from "./services/upi-module-service";
