import { MedusaService } from "@medusajs/framework/utils"
import { Wallet } from "../models/wallet"
import { Transaction } from "../models/transaction"

class BarterWalletModuleService extends MedusaService({
  Wallet,
  Transaction,
}) {

  // ── Wallet Management ─────────────────────────────────────────────────────

  async getOrCreateWallet(userId: string) {
    const existing = await this.listWallets({ user_id: [userId] })
    if (existing.length) return existing[0]

    const [wallet] = await this.createWallets([{
      user_id: userId,
      balance: 0,
      lifetime_earned: 0,
      lifetime_spent: 0,
      frozen_balance: 0,
      currency_code: "BRT",
      is_active: true,
    }])
    return wallet
  }

  async getWalletByUser(userId: string) {
    const wallets = await this.listWallets({ user_id: [userId] })
    if (!wallets.length) throw new Error("Wallet not found for user")
    return wallets[0]
  }

  async getBalance(userId: string) {
    const wallet = await this.getWalletByUser(userId)
    const balance = Number(wallet.balance) || 0
    const frozen = Number(wallet.frozen_balance) || 0
    return {
      balance,
      frozen,
      available: balance - frozen,
      lifetime_earned: Number(wallet.lifetime_earned) || 0,
      lifetime_spent: Number(wallet.lifetime_spent) || 0,
    }
  }

  // ── Credit Operations ─────────────────────────────────────────────────────

  async creditWallet(input: {
    user_id: string
    amount: number
    reference_type: string
    reference_id?: string
    description?: string
  }) {
    if (input.amount <= 0) throw new Error("Credit amount must be positive")

    const wallet = await this.getOrCreateWallet(input.user_id)
    const currentBalance = Number(wallet.balance) || 0
    const currentEarned = Number(wallet.lifetime_earned) || 0
    const newBalance = currentBalance + input.amount

    await this.updateWallets([{
      id: wallet.id,
      balance: newBalance,
      lifetime_earned: currentEarned + input.amount,
      last_transaction_at: new Date(),
    }])

    const [txn] = await this.createTransactions([{
      wallet_id: wallet.id,
      type: "credit",
      amount: input.amount,
      balance_after: newBalance,
      reference_type: input.reference_type,
      reference_id: input.reference_id || null,
      description: input.description || `Earned ${input.amount} BRT`,
    }])

    return { wallet_id: wallet.id, balance: newBalance, transaction: txn }
  }

  async debitWallet(input: {
    user_id: string
    amount: number
    reference_type: string
    reference_id?: string
    description?: string
  }) {
    if (input.amount <= 0) throw new Error("Debit amount must be positive")

    const wallet = await this.getWalletByUser(input.user_id)
    const currentBalance = Number(wallet.balance) || 0
    const frozenBalance = Number(wallet.frozen_balance) || 0
    const currentSpent = Number(wallet.lifetime_spent) || 0
    const available = currentBalance - frozenBalance

    if (input.amount > available) {
      throw new Error(`Insufficient balance. Available: ${available}, Required: ${input.amount}`)
    }

    const newBalance = currentBalance - input.amount

    await this.updateWallets([{
      id: wallet.id,
      balance: newBalance,
      lifetime_spent: currentSpent + input.amount,
      last_transaction_at: new Date(),
    }])

    const [txn] = await this.createTransactions([{
      wallet_id: wallet.id,
      type: "debit",
      amount: input.amount,
      balance_after: newBalance,
      reference_type: input.reference_type,
      reference_id: input.reference_id || null,
      description: input.description || `Spent ${input.amount} BRT`,
    }])

    return { wallet_id: wallet.id, balance: newBalance, transaction: txn }
  }

  // ── Escrow (hold credits while task is in progress) ───────────────────────

  async holdEscrow(input: {
    user_id: string
    amount: number
    reference_id: string
    description?: string
  }) {
    const wallet = await this.getWalletByUser(input.user_id)
    const currentBalance = Number(wallet.balance) || 0
    const frozenBalance = Number(wallet.frozen_balance) || 0
    const available = currentBalance - frozenBalance

    if (input.amount > available) {
      throw new Error("Insufficient available balance for escrow hold")
    }

    await this.updateWallets([{
      id: wallet.id,
      frozen_balance: frozenBalance + input.amount,
      last_transaction_at: new Date(),
    }])

    const [txn] = await this.createTransactions([{
      wallet_id: wallet.id,
      type: "escrow_hold",
      amount: input.amount,
      balance_after: wallet.balance,
      reference_type: "task",
      reference_id: input.reference_id,
      description: input.description || `Escrow hold for task ${input.reference_id}`,
    }])

    return { wallet_id: wallet.id, frozen: wallet.frozen_balance + input.amount, transaction: txn }
  }

  async releaseEscrow(input: {
    user_id: string
    amount: number
    reference_id: string
    release_to_user_id?: string
    description?: string
  }) {
    const wallet = await this.getWalletByUser(input.user_id)
    const currentBalance = Number(wallet.balance) || 0
    const frozenBalance = Number(wallet.frozen_balance) || 0
    const currentSpent = Number(wallet.lifetime_spent) || 0

    if (input.amount > frozenBalance) {
      throw new Error("Release amount exceeds frozen balance")
    }

    // Unfreeze from payer
    const newBalance = currentBalance - input.amount
    await this.updateWallets([{
      id: wallet.id,
      balance: newBalance,
      frozen_balance: frozenBalance - input.amount,
      lifetime_spent: currentSpent + input.amount,
      last_transaction_at: new Date(),
    }])

    await this.createTransactions([{
      wallet_id: wallet.id,
      type: "escrow_release",
      amount: input.amount,
      balance_after: newBalance,
      reference_type: "task",
      reference_id: input.reference_id,
      description: input.description || `Escrow released for task ${input.reference_id}`,
    }])

    // Credit the earner
    if (input.release_to_user_id) {
      await this.creditWallet({
        user_id: input.release_to_user_id,
        amount: input.amount,
        reference_type: "task",
        reference_id: input.reference_id,
        description: `Earned from completing task ${input.reference_id}`,
      })
    }

    return { success: true }
  }

  // ── Transaction History ───────────────────────────────────────────────────

  async getTransactionHistory(userId: string, limit = 20, offset = 0) {
    const wallet = await this.getWalletByUser(userId)
    return this.listTransactions(
      { wallet_id: [wallet.id] },
      { order: { created_at: "DESC" }, take: limit, skip: offset }
    )
  }
}

export default BarterWalletModuleService
