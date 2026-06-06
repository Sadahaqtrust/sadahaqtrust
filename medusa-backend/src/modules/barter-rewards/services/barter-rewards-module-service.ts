import { MedusaService } from "@medusajs/framework/utils"
import { Reward } from "../models/reward"
import { RewardRedemption } from "../models/reward-redemption"
import { RewardPartner } from "../models/reward-partner"

class BarterRewardsModuleService extends MedusaService({
  Reward,
  RewardRedemption,
  RewardPartner,
}) {

  // ── Partner Management ────────────────────────────────────────────────────

  async registerPartner(input: {
    name: string
    category: string
    logo_url?: string
    contact_person?: string
    contact_email?: string
    contact_phone?: string
    website?: string
  }) {
    const [partner] = await this.createRewardPartners([{
      ...input,
      is_active: true,
      total_rewards_supplied: 0,
      total_redemptions: 0,
    }])
    return partner
  }

  async listActivePartners() {
    return this.listRewardPartners({ is_active: [true] }, { order: { name: "ASC" } })
  }

  // ── Reward Catalog ────────────────────────────────────────────────────────

  async addReward(input: {
    partner_id?: string
    title: string
    description?: string
    category: string
    subcategory?: string
    image_url?: string
    credit_cost: number
    retail_value?: number
    stock_total: number
    delivery_type?: string
    delivery_instructions?: string
    voucher_code_pool?: string[]
    is_featured?: boolean
    valid_from?: Date
    valid_until?: Date
    min_age?: number
    max_redemptions_per_user?: number
    tags?: string
  }) {
    if (input.credit_cost <= 0) throw new Error("Credit cost must be positive")

    const [reward] = await this.createRewards([{
      ...input,
      stock_remaining: input.stock_total,
      voucher_code_pool: input.voucher_code_pool ? JSON.stringify(input.voucher_code_pool) : null,
      is_active: true,
    }])

    // Update partner stats
    if (input.partner_id) {
      const [partner] = await this.listRewardPartners({ id: [input.partner_id] })
      if (partner) {
        await this.updateRewardPartners([{
          id: input.partner_id,
          total_rewards_supplied: partner.total_rewards_supplied + 1,
        }])
      }
    }

    return reward
  }

  async browseRewards(filters: {
    category?: string
    max_cost?: number
    is_featured?: boolean
    delivery_type?: string
  }, limit = 20, offset = 0) {
    const filter: any = { is_active: [true] }

    if (filters.category) filter.category = [filters.category]
    if (filters.delivery_type) filter.delivery_type = [filters.delivery_type]
    if (filters.is_featured !== undefined) filter.is_featured = [filters.is_featured]

    return this.listRewards(filter, {
      order: { is_featured: "DESC", credit_cost: "ASC" },
      take: limit,
      skip: offset,
    })
  }

  async getRewardDetail(rewardId: string) {
    const [reward] = await this.listRewards({ id: [rewardId] })
    if (!reward) throw new Error("Reward not found")
    return reward
  }

  // ── Redemption ────────────────────────────────────────────────────────────

  async redeemReward(input: {
    reward_id: string
    user_id: string
    delivery_address?: string
  }) {
    const [reward] = await this.listRewards({ id: [input.reward_id] })
    if (!reward) throw new Error("Reward not found")
    if (!reward.is_active) throw new Error("Reward is no longer available")
    if (reward.stock_remaining <= 0) throw new Error("Reward is out of stock")

    // Check max redemptions per user
    if (reward.max_redemptions_per_user > 0) {
      const userRedemptions = await this.listRewardRedemptions({
        reward_id: [input.reward_id],
        user_id: [input.user_id],
        status: ["pending", "processing", "fulfilled"],
      })
      if (userRedemptions.length >= reward.max_redemptions_per_user) {
        throw new Error("Maximum redemptions reached for this reward")
      }
    }

    // Assign voucher code if digital
    let voucherCode: string | null = null
    if (reward.delivery_type === "voucher" && reward.voucher_code_pool) {
      const codes: string[] = JSON.parse(reward.voucher_code_pool)
      if (codes.length > 0) {
        voucherCode = codes.shift()!
        await this.updateRewards([{
          id: input.reward_id,
          voucher_code_pool: JSON.stringify(codes),
        }])
      }
    }

    // Create redemption record
    const [redemption] = await this.createRewardRedemptions([{
      reward_id: input.reward_id,
      user_id: input.user_id,
      credits_spent: reward.credit_cost,
      status: reward.delivery_type === "digital" || voucherCode ? "fulfilled" : "pending",
      voucher_code: voucherCode,
      delivery_address: input.delivery_address || null,
      fulfilled_at: (reward.delivery_type === "digital" || voucherCode) ? new Date() : null,
    }])

    // Decrease stock
    await this.updateRewards([{
      id: input.reward_id,
      stock_remaining: reward.stock_remaining - 1,
    }])

    // Update partner stats
    if (reward.partner_id) {
      const [partner] = await this.listRewardPartners({ id: [reward.partner_id] })
      if (partner) {
        await this.updateRewardPartners([{
          id: reward.partner_id,
          total_redemptions: partner.total_redemptions + 1,
        }])
      }
    }

    return {
      redemption,
      credit_cost: reward.credit_cost,
      voucher_code: voucherCode,
    }
  }

  async getMyRedemptions(userId: string) {
    return this.listRewardRedemptions(
      { user_id: [userId] },
      { order: { created_at: "DESC" } }
    )
  }

  async fulfillRedemption(redemptionId: string, notes?: string) {
    await this.updateRewardRedemptions([{
      id: redemptionId,
      status: "fulfilled",
      fulfilled_at: new Date(),
      notes: notes || null,
    }])
    return { id: redemptionId, status: "fulfilled" }
  }
}

export default BarterRewardsModuleService
