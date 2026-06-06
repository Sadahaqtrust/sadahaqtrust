import { MedusaService } from "@medusajs/framework/utils";
import { MerchantConfig } from "../models/merchant-config";
import { UpiPayment } from "../models/upi-payment";

class UpiModuleService extends MedusaService({ MerchantConfig, UpiPayment }) {}

export default UpiModuleService;
