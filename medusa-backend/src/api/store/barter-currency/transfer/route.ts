import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * POST /store/barter-currency/transfer - Transfer currency between users
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const currencyService = req.scope.resolve("barterCurrencyModuleService") as any
  const { from_user_id, to_user_id, amount, transfer_type, reference_type, reference_id, description } = req.body as any

  if (!from_user_id || !to_user_id || !amount || !transfer_type) {
    return res.status(400).json({ error: "from_user_id, to_user_id, amount, and transfer_type are required" })
  }

  try {
    const result = await currencyService.transfer({
      from_user_id,
      to_user_id,
      amount: Number(amount),
      transfer_type,
      reference_type,
      reference_id,
      description,
    })
    res.json(result)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
