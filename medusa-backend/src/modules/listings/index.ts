import { Module } from "@medusajs/framework/utils"
import ListingsModuleService from "./services/listings-module-service"

export const LISTINGS_MODULE = "listings"

export default Module(LISTINGS_MODULE, { service: ListingsModuleService })
