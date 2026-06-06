import { MedusaService } from "@medusajs/framework/utils"
import { Listing } from "../models/listing"
import { ListingResponse } from "../models/listing-response"

class ListingsModuleService extends MedusaService({
  Listing,
  ListingResponse,
}) {}

export default ListingsModuleService
