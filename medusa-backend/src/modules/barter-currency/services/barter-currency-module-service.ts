import { MedusaService } from "@medusajs/framework/utils"
import { CurrencyAccount } from "../models/currency-account"
import { CreditLine } from "../models/credit-line"
import { CurrencyTransfer } from "../models/currency-transfer"
import { CurrencyConfig } from "../models/currency-config"

// Default config values
const DEFAULTS = {
  max_individual_credit_limit: 500,
  max_partner_credit_limit: 5000,
  new_user_credit_limit: 50,
  trust_score_credit_multiplier: 5, // credit_limit = trust_score * multiplier
  currency_name: "SDC",
  currency_symbol: "Ⓢ",
}

class BarterCurrencyModuleService extends MedusaService({
  CurrencyAccount,
  CreditLine,
  CurrencyTransfer,
  CurrencyConfig,
}) {

  // ── Account Management ────────────────────────────────────────────────────

  async getOrCreateAccount(userId: string, accountType = "individual") {
    const existing = await this.listCurrencyAccounts({ user_id: [userId] })
    if (existing.length) return existing[0]

    const creditLimit = accountType === "partner"
      ? DEFAULTS.max_partner_credit_limit
      : DEFAULTS.new_user_credit_limit

    const [account] = await this.createCurrencyAccounts([{
      user_id: userId,
      account_type: accountType,
      balance: 0,
      credit_limit: creditLimit,
      trust_score: 50,
      is_active: true,
      is_frozen: false,
    }])
    return account
  }

  async getAccountBalance(userId: string) {
    const account = await this.getOrCreateAccount(userId)
    return {
      balance: account.balance,
      credit_limit: account.credit_limit,
      available: account.balance + account.credit_limit, // can spend balance + credit
      trust_score: account.trust_score,
      account_type: account.account_type,
    }
  }

  // ── Transfers ─────────────────────────────────────────────────────────────

  async transfer(input: {
    from_user_id: string
    to_user_id: string
    amount: number
    transfer_type: string
    reference_type?: string
    reference_id?: string
    description?: string
  }) {
    if (input.amount <= 0) throw new Error("Transfer amount must be positive")
    if (input.from_user_id === input.to_user_id) throw new Error("Cannot transfer to self")

    const fromAccount = await this.getOrCreateAccount(input.from_user_id)
    const toAccount = await this.getOrCreateAccount(input.to_user_id)

    if (fromAccount.is_frozen) throw new Error("Sender account is frozen")
    if (toAccount.is_frozen) throw new Error("Receiver account is frozen")

    const fromBalance = Number(fromAccount.balance) || 0
    const fromCreditLimit = Number(fromAccount.credit_limit) || 0
    const toBalance = Number(toAccount.balance) || 0

    // Check available balance (balance + credit limit)
    const available = fromBalance + fromCreditLimit
    if (input.amount > available) {
      throw new Error(`Insufficient funds. Available: ${available}, Required: ${input.amount}`)
    }

    const newFromBalance = fromBalance - input.amount
    const newToBalance = toBalance + input.amount

    // Update balances
    await this.updateCurrencyAccounts([
      {
        id: fromAccount.id,
        balance: newFromBalance,
        total_redeemed: (Number(fromAccount.total_redeemed) || 0) + input.amount,
        last_activity_at: new Date(),
      },
      {
        id: toAccount.id,
        balance: newToBalance,
        total_issued: (Number(toAccount.total_issued) || 0) + input.amount,
        last_activity_at: new Date(),
      },
    ])

    // Record transfer
    const [transfer] = await this.createCurrencyTransfers([{
      from_account_id: fromAccount.id,
      to_account_id: toAccount.id,
      amount: input.amount,
      transfer_type: input.transfer_type,
      reference_type: input.reference_type || null,
      reference_id: input.reference_id || null,
      status: "completed",
      description: input.description || null,
      from_balance_after: newFromBalance,
      to_balance_after: newToBalance,
    }])

    return {
      transfer,
      from_balance: newFromBalance,
      to_balance: newToBalance,
    }
  }

  // ── Platform Issuance (mint new currency) ─────────────────────────────────

  async issueCurrency(input: {
    to_user_id: string
    amount: number
    reason: string
    reference_type?: string
    reference_id?: string
  }) {
    if (input.amount <= 0) throw new Error("Issue amount must be positive")

    const toAccount = await this.getOrCreateAccount(input.to_user_id)
    const currentBalance = Number(toAccount.balance) || 0
    const newBalance = currentBalance + input.amount

    await this.updateCurrencyAccounts([{
      id: toAccount.id,
      balance: newBalance,
      total_issued: (Number(toAccount.total_issued) || 0) + input.amount,
      last_activity_at: new Date(),
    }])

    // Record as transfer from platform
    const platformAccounts = await this.listCurrencyAccounts({ account_type: ["platform"] })
    let platformAccountId = "platform"
    if (platformAccounts.length) {
      platformAccountId = platformAccounts[0].id
    }

    const [transfer] = await this.createCurrencyTransfers([{
      from_account_id: platformAccountId,
      to_account_id: toAccount.id,
      amount: input.amount,
      transfer_type: "reward",
      reference_type: input.reference_type || "platform",
      reference_id: input.reference_id || null,
      status: "completed",
      description: input.reason,
      from_balance_after: 0,
      to_balance_after: newBalance,
    }])

    return { transfer, new_balance: newBalance }
  }

  // ── Credit Lines (Mutual Credit) ──────────────────────────────────────────

  async extendCreditLine(input: {
    from_user_id: string
    to_user_id: string
    credit_amount: number
    reason?: string
    expires_at?: Date
  }) {
    const fromAccount = await this.getOrCreateAccount(input.from_user_id)
    const toAccount = await this.getOrCreateAccount(input.to_user_id)

    const [creditLine] = await this.createCreditLines([{
      from_account_id: fromAccount.id,
      to_account_id: toAccount.id,
      credit_amount: input.credit_amount,
      utilized: 0,
      interest_rate: 0,
      status: "active",
      expires_at: input.expires_at || null,
      reason: input.reason || null,
    }])

    // Increase receiver's credit limit
    await this.updateCurrencyAccounts([{
      id: toAccount.id,
      credit_limit: toAccount.credit_limit + input.credit_amount,
    }])

    return creditLine
  }

  async getActiveCreditLines(userId: string) {
    const account = await this.getOrCreateAccount(userId)
    const received = await this.listCreditLines({
      to_account_id: [account.id],
      status: ["active"],
    })
    const extended = await this.listCreditLines({
      from_account_id: [account.id],
      status: ["active"],
    })
    return { received, extended }
  }

  // ── Trust Score Management ────────────────────────────────────────────────

  async updateTrustScore(userId: string, delta: number) {
    const account = await this.getOrCreateAccount(userId)
    const currentScore = Number(account.trust_score) || 50
    const newScore = Math.min(100, Math.max(0, currentScore + delta))
    const newCreditLimit = newScore * DEFAULTS.trust_score_credit_multiplier

    await this.updateCurrencyAccounts([{
      id: account.id,
      trust_score: newScore,
      credit_limit: newCreditLimit,
    }])

    return { trust_score: newScore, credit_limit: newCreditLimit }
  }

  // ── Transaction History ───────────────────────────────────────────────────

  async getTransferHistory(userId: string, limit = 20, offset = 0) {
    const account = await this.getOrCreateAccount(userId)
    // Get transfers where user is sender or receiver
    const sent = await this.listCurrencyTransfers(
      { from_account_id: [account.id] },
      { order: { created_at: "DESC" }, take: limit, skip: offset }
    )
    const received = await this.listCurrencyTransfers(
      { to_account_id: [account.id] },
      { order: { created_at: "DESC" }, take: limit, skip: offset }
    )

    // Merge and sort
    const all = [...sent.map((t: any) => ({ ...t, direction: "out" })),
                 ...received.map((t: any) => ({ ...t, direction: "in" }))]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)

    return all
  }

  // ── Currency Stats (Admin) ────────────────────────────────────────────────

  async getCurrencyStats() {
    const allAccounts = await this.listCurrencyAccounts({})
    const totalSupply = allAccounts.reduce((sum: number, a: any) => sum + Math.max(0, a.balance), 0)
    const totalDebt = allAccounts.reduce((sum: number, a: any) => sum + Math.abs(Math.min(0, a.balance)), 0)
    const activeAccounts = allAccounts.filter((a: any) => a.is_active).length

    return {
      total_supply: totalSupply,
      total_debt: totalDebt,
      net_circulation: totalSupply - totalDebt,
      total_accounts: allAccounts.length,
      active_accounts: activeAccounts,
      currency_name: DEFAULTS.currency_name,
    }
  }
}

export default BarterCurrencyModuleService
