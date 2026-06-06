import DeliveryModuleService from "./services/delivery-module-service";
import { Module } from "@medusajs/framework/utils";
import { Driver } from "./models/driver";
import { DeliveryOrder } from "./models/delivery-order";
import { ServiceZone } from "./models/service-zone";
import { TimeSlot } from "./models/time-slot";
import { TrackingEvent } from "./models/tracking-event";

export const DELIVERY_MODULE = "deliveryModuleService";

export default Module(DELIVERY_MODULE, {
  service: DeliveryModuleService,
});

export { Driver, DeliveryOrder, ServiceZone, TimeSlot, TrackingEvent };
export type { DeliveryLifecycleStatus } from "./models/delivery-order";
export { DELIVERY_LIFECYCLE_STATUSES } from "./models/delivery-order";
export { default as DeliveryModuleService } from "./services/delivery-module-service";
