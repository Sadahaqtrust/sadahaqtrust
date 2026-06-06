import { ExecArgs } from "@medusajs/framework/types"

/**
 * Seed script for the Barter System.
 * Run with: medusa exec ./src/scripts/seed-barter-system.ts
 *
 * Seeds: Badges, Sample Rewards, Sample Tasks, and a Platform currency account.
 */
export default async function seedBarterSystem({ container }: ExecArgs) {
  const gamificationService = container.resolve("barterGamificationModuleService") as any
  const rewardsService = container.resolve("barterRewardsModuleService") as any
  const taskService = container.resolve("barterTasksModuleService") as any
  const currencyService = container.resolve("barterCurrencyModuleService") as any

  console.log("🎮 Seeding Barter System...")

  // ── 1. Seed Badges ──────────────────────────────────────────────────────

  console.log("  → Seeding badges...")
  const badges = [
    // Task milestones
    { name: "First Step", description: "Complete your first task", icon_url: "/badges/first-step.png", category: "milestone", tier: "bronze", criteria_type: "task_count", criteria_value: 1, bonus_credits: 10, sort_order: 1 },
    { name: "Getting Started", description: "Complete 5 tasks", icon_url: "/badges/getting-started.png", category: "milestone", tier: "bronze", criteria_type: "task_count", criteria_value: 5, bonus_credits: 25, sort_order: 2 },
    { name: "Task Machine", description: "Complete 25 tasks", icon_url: "/badges/task-machine.png", category: "milestone", tier: "silver", criteria_type: "task_count", criteria_value: 25, bonus_credits: 50, sort_order: 3 },
    { name: "Hustler", description: "Complete 50 tasks", icon_url: "/badges/hustler.png", category: "milestone", tier: "gold", criteria_type: "task_count", criteria_value: 50, bonus_credits: 100, sort_order: 4 },
    { name: "Legend", description: "Complete 100 tasks", icon_url: "/badges/legend.png", category: "milestone", tier: "platinum", criteria_type: "task_count", criteria_value: 100, bonus_credits: 250, sort_order: 5 },

    // Streak badges
    { name: "3-Day Streak", description: "Active for 3 days in a row", icon_url: "/badges/streak-3.png", category: "streak", tier: "bronze", criteria_type: "streak_days", criteria_value: 3, bonus_credits: 15, sort_order: 10 },
    { name: "Week Warrior", description: "7-day activity streak", icon_url: "/badges/streak-7.png", category: "streak", tier: "silver", criteria_type: "streak_days", criteria_value: 7, bonus_credits: 35, sort_order: 11 },
    { name: "Monthly Master", description: "30-day activity streak", icon_url: "/badges/streak-30.png", category: "streak", tier: "gold", criteria_type: "streak_days", criteria_value: 30, bonus_credits: 150, sort_order: 12 },

    // Level badges
    { name: "Level 3 Hustler", description: "Reach level 3", icon_url: "/badges/level-3.png", category: "skill", tier: "bronze", criteria_type: "level", criteria_value: 3, bonus_credits: 20, sort_order: 20 },
    { name: "Level 5 Pro", description: "Reach level 5", icon_url: "/badges/level-5.png", category: "skill", tier: "silver", criteria_type: "level", criteria_value: 5, bonus_credits: 50, sort_order: 21 },
    { name: "Level 7 Champion", description: "Reach level 7", icon_url: "/badges/level-7.png", category: "skill", tier: "gold", criteria_type: "level", criteria_value: 7, bonus_credits: 100, sort_order: 22 },

    // Reputation badges
    { name: "Trusted", description: "Achieve 70+ reputation score", icon_url: "/badges/trusted.png", category: "social", tier: "silver", criteria_type: "rating_avg", criteria_value: 70, bonus_credits: 30, sort_order: 30 },
    { name: "Highly Rated", description: "Achieve 90+ reputation score", icon_url: "/badges/highly-rated.png", category: "social", tier: "gold", criteria_type: "rating_avg", criteria_value: 90, bonus_credits: 75, sort_order: 31 },

    // Referral badges
    { name: "Connector", description: "Refer 3 friends", icon_url: "/badges/connector.png", category: "community", tier: "bronze", criteria_type: "referrals", criteria_value: 3, bonus_credits: 30, sort_order: 40 },
    { name: "Community Builder", description: "Refer 10 friends", icon_url: "/badges/community-builder.png", category: "community", tier: "silver", criteria_type: "referrals", criteria_value: 10, bonus_credits: 100, sort_order: 41 },
  ]

  for (const badge of badges) {
    try {
      await gamificationService.createBadges([{ ...badge, is_active: true }])
    } catch (e: any) {
      console.log(`    ⚠ Badge "${badge.name}" may already exist: ${e.message}`)
    }
  }
  console.log(`  ✓ ${badges.length} badges seeded`)

  // ── 2. Seed Reward Partners ─────────────────────────────────────────────

  console.log("  → Seeding reward partners...")
  const partners = [
    { name: "Jio", category: "telecom", contact_person: "Partner Manager" },
    { name: "Airtel", category: "telecom", contact_person: "Partner Manager" },
    { name: "Spotify India", category: "streaming", contact_person: "Partner Manager" },
    { name: "YouTube Premium", category: "streaming", contact_person: "Partner Manager" },
    { name: "Zomato", category: "food", contact_person: "Partner Manager" },
    { name: "Udemy", category: "education", contact_person: "Partner Manager" },
  ]

  const createdPartners: any[] = []
  for (const partner of partners) {
    try {
      const p = await rewardsService.registerPartner(partner)
      createdPartners.push(p)
    } catch (e: any) {
      console.log(`    ⚠ Partner "${partner.name}" may already exist: ${e.message}`)
    }
  }
  console.log(`  ✓ ${partners.length} partners seeded`)

  // ── 3. Seed Sample Rewards ──────────────────────────────────────────────

  console.log("  → Seeding sample rewards...")
  const rewards = [
    { title: "Jio 1GB Data Pack", category: "data_pack", credit_cost: 30, retail_value: 19, stock_total: 100, delivery_type: "voucher", partner_idx: 0 },
    { title: "Airtel 2GB Data Pack", category: "data_pack", credit_cost: 50, retail_value: 49, stock_total: 100, delivery_type: "voucher", partner_idx: 1 },
    { title: "Spotify 1-Week Trial", category: "streaming", credit_cost: 75, retail_value: 59, stock_total: 50, delivery_type: "voucher", partner_idx: 2 },
    { title: "YouTube Premium 3-Day Pass", category: "streaming", credit_cost: 40, retail_value: 39, stock_total: 50, delivery_type: "digital", partner_idx: 3 },
    { title: "Zomato ₹50 Voucher", category: "food", credit_cost: 100, retail_value: 50, stock_total: 30, delivery_type: "voucher", partner_idx: 4 },
    { title: "Udemy Course Coupon (₹199)", category: "education", credit_cost: 150, retail_value: 199, stock_total: 20, delivery_type: "voucher", partner_idx: 5 },
    { title: "BGMI 60 UC", category: "gaming", credit_cost: 60, retail_value: 75, stock_total: 50, delivery_type: "digital" },
    { title: "Free Fire 100 Diamonds", category: "gaming", credit_cost: 45, retail_value: 40, stock_total: 50, delivery_type: "digital" },
  ]

  for (const reward of rewards) {
    try {
      const { partner_idx, ...rewardData } = reward as any
      const partnerId = partner_idx !== undefined && createdPartners[partner_idx]
        ? createdPartners[partner_idx].id
        : null
      await rewardsService.addReward({ ...rewardData, partner_id: partnerId })
    } catch (e: any) {
      console.log(`    ⚠ Reward "${reward.title}": ${e.message}`)
    }
  }
  console.log(`  ✓ ${rewards.length} rewards seeded`)

  // ── 4. Seed Sample Tasks ────────────────────────────────────────────────

  console.log("  → Seeding sample tasks...")
  const tasks = [
    { posted_by: "platform", poster_type: "platform", title: "Share a Reel about Digital Rohtak", description: "Create a 30-second reel showcasing something cool about Rohtak and post it on Instagram with #DigitalRohtak", category: "creative", reward_credits: 25, estimated_minutes: 30, difficulty: "easy", verification_type: "photo_proof", tags: "social,creative,instagram" },
    { posted_by: "platform", poster_type: "platform", title: "Help a Junior with Homework (1 hour)", description: "Tutor a younger student in any subject for 1 hour. Take a selfie together as proof.", category: "peer_help", reward_credits: 40, estimated_minutes: 60, difficulty: "easy", verification_type: "photo_proof", tags: "tutoring,education,community" },
    { posted_by: "platform", poster_type: "platform", title: "Design a Poster for Local Event", description: "Create a digital poster (Canva/Photoshop) for an upcoming community event. Submit the design file.", category: "creative", reward_credits: 50, estimated_minutes: 45, difficulty: "medium", verification_type: "photo_proof", tags: "design,canva,creative" },
    { posted_by: "platform", poster_type: "platform", title: "Park Cleanup Drive (30 min)", description: "Spend 30 minutes cleaning up litter at your nearest park. Take before/after photos.", category: "community", reward_credits: 35, estimated_minutes: 30, difficulty: "easy", location_type: "local", verification_type: "photo_proof", tags: "community,cleanup,environment" },
    { posted_by: "platform", poster_type: "platform", title: "Data Entry: Local Shop Listings", description: "Enter details of 10 local shops (name, address, phone, category) into our form.", category: "digital", reward_credits: 30, estimated_minutes: 20, difficulty: "easy", verification_type: "auto", tags: "data-entry,digital,typing" },
    { posted_by: "platform", poster_type: "platform", title: "Translate Content: Hindi to English", description: "Translate a 500-word article from Hindi to English. Must be accurate and natural.", category: "digital", reward_credits: 45, estimated_minutes: 40, difficulty: "medium", verification_type: "peer_review", tags: "translation,language,writing" },
    { posted_by: "platform", poster_type: "platform", title: "Test Our App & Report Bugs", description: "Use the Digital Rohtak app for 15 minutes and report any bugs or UX issues you find.", category: "digital", reward_credits: 20, estimated_minutes: 15, difficulty: "easy", verification_type: "self_report", tags: "testing,app,feedback" },
    { posted_by: "platform", poster_type: "platform", title: "Record a Voice-Over (Hindi)", description: "Record a 1-minute voice-over script in clear Hindi. Good for those with clear speech.", category: "creative", reward_credits: 35, estimated_minutes: 20, difficulty: "medium", verification_type: "photo_proof", tags: "voice,audio,hindi,creative" },
  ]

  for (const task of tasks) {
    try {
      await taskService.postTask(task)
    } catch (e: any) {
      console.log(`    ⚠ Task "${task.title}": ${e.message}`)
    }
  }
  console.log(`  ✓ ${tasks.length} sample tasks seeded`)

  // ── 5. Create Platform Currency Account ─────────────────────────────────

  console.log("  → Creating platform currency account...")
  try {
    await currencyService.getOrCreateAccount("platform", "platform")
    console.log("  ✓ Platform currency account created")
  } catch (e: any) {
    console.log(`    ⚠ Platform account: ${e.message}`)
  }

  console.log("\n✅ Barter System seeded successfully!")
  console.log("\n📋 API Endpoints available:")
  console.log("  Wallet:        GET/POST /store/barter-wallet")
  console.log("  Tasks:         GET/POST /store/barter-tasks")
  console.log("  Rewards:       GET/POST /store/barter-rewards")
  console.log("  Gamification:  GET      /store/barter-gamification")
  console.log("  Currency:      GET/POST /store/barter-currency")
}
