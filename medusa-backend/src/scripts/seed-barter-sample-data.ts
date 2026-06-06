import { ExecArgs } from "@medusajs/framework/types"

/**
 * Extended sample data for Barter System E2E testing.
 * Run: npx medusa exec ./src/scripts/seed-barter-sample-data.ts
 */
export default async function seedBarterSampleData({ container }: ExecArgs) {
  const taskService = container.resolve("barterTasksModuleService") as any
  const rewardsService = container.resolve("barterRewardsModuleService") as any
  const walletService = container.resolve("barterWalletModuleService") as any
  const gamificationService = container.resolve("barterGamificationModuleService") as any
  const currencyService = container.resolve("barterCurrencyModuleService") as any

  console.log("🎯 Seeding Extended Barter Sample Data...")

  // ── Additional Tasks (20 more) ─────────────────────────────────────────
  console.log("  → Adding 20 more tasks...")
  const moreTasks = [
    { posted_by: "platform", poster_type: "platform", title: "Create Instagram Story for Local Shop", description: "Visit any local shop, create a 15-second Instagram story tagging @digitalrohtak", category: "creative", reward_credits: 20, estimated_minutes: 15, difficulty: "easy", verification_type: "photo_proof", max_applicants: 10, tags: "instagram,social,local" },
    { posted_by: "platform", poster_type: "platform", title: "Write a Google Review for 3 Shops", description: "Write honest 4+ star reviews for 3 shops you've visited. Screenshot as proof.", category: "digital", reward_credits: 25, estimated_minutes: 20, difficulty: "easy", verification_type: "photo_proof", max_applicants: 20, tags: "review,google,local" },
    { posted_by: "platform", poster_type: "platform", title: "Teach Basic English to a Junior (2 hrs)", description: "Teach basic English conversation to a class 5-8 student for 2 hours", category: "peer_help", reward_credits: 60, estimated_minutes: 120, difficulty: "medium", verification_type: "photo_proof", max_applicants: 5, tags: "tutoring,english,education" },
    { posted_by: "platform", poster_type: "platform", title: "Create a TikTok/Reel: Rohtak Street Food", description: "Make a 30-60 second reel showcasing Rohtak's best street food spots", category: "creative", reward_credits: 40, estimated_minutes: 45, difficulty: "medium", verification_type: "photo_proof", max_applicants: 10, tags: "reel,food,rohtak,creative" },
    { posted_by: "platform", poster_type: "platform", title: "Help Elderly Neighbor with Smartphone", description: "Spend 30 min teaching an elderly person to use WhatsApp/UPI. Get their thumbs up photo.", category: "community", reward_credits: 35, estimated_minutes: 30, difficulty: "easy", verification_type: "photo_proof", max_applicants: 15, tags: "community,elderly,digital-literacy" },
    { posted_by: "platform", poster_type: "platform", title: "Collect 5 Local Business Cards", description: "Visit 5 local businesses, collect their cards, and enter details in our form", category: "local", reward_credits: 20, estimated_minutes: 30, difficulty: "easy", verification_type: "photo_proof", max_applicants: 20, tags: "data,local,business" },
    { posted_by: "platform", poster_type: "platform", title: "Design Social Media Post (Canva)", description: "Create 3 social media posts for Digital Rohtak using Canva. Submit PNG files.", category: "creative", reward_credits: 45, estimated_minutes: 40, difficulty: "medium", verification_type: "photo_proof", max_applicants: 5, tags: "design,canva,social-media" },
    { posted_by: "platform", poster_type: "platform", title: "Survey: Rate Your Colony's Cleanliness", description: "Fill a 10-question survey about your colony's cleanliness and upload 3 photos", category: "community", reward_credits: 15, estimated_minutes: 10, difficulty: "easy", verification_type: "self_report", max_applicants: 50, tags: "survey,colony,cleanliness" },
    { posted_by: "platform", poster_type: "platform", title: "Record 5 Hindi Audio Clips (30 sec each)", description: "Record 5 clear Hindi sentences we provide. Good for voice-over practice.", category: "creative", reward_credits: 30, estimated_minutes: 20, difficulty: "easy", verification_type: "photo_proof", max_applicants: 10, tags: "audio,hindi,voice" },
    { posted_by: "platform", poster_type: "platform", title: "Math Tutoring: Help Class 10 Student", description: "Help a class 10 student with math for 1 hour. Must know algebra and geometry.", category: "peer_help", reward_credits: 50, estimated_minutes: 60, difficulty: "medium", verification_type: "photo_proof", max_applicants: 5, tags: "math,tutoring,class10" },
    { posted_by: "platform", poster_type: "platform", title: "Plant 3 Saplings in Your Area", description: "Buy/get 3 saplings, plant them in a public area, and take before/after photos", category: "community", reward_credits: 40, estimated_minutes: 45, difficulty: "easy", verification_type: "photo_proof", max_applicants: 30, tags: "environment,planting,green" },
    { posted_by: "platform", poster_type: "platform", title: "Create WhatsApp Sticker Pack (10 stickers)", description: "Design 10 Rohtak-themed WhatsApp stickers using any sticker maker app", category: "creative", reward_credits: 35, estimated_minutes: 40, difficulty: "medium", verification_type: "photo_proof", max_applicants: 5, tags: "whatsapp,stickers,design" },
    { posted_by: "platform", poster_type: "platform", title: "Deliver Groceries to Elderly (within 2km)", description: "Pick up groceries from a store and deliver to an elderly person within 2km radius", category: "local", reward_credits: 30, estimated_minutes: 30, difficulty: "easy", location_type: "local", verification_type: "photo_proof", max_applicants: 10, tags: "delivery,elderly,local" },
    { posted_by: "platform", poster_type: "platform", title: "Proofread Hindi Article (500 words)", description: "Check a Hindi article for spelling/grammar errors. Mark corrections.", category: "digital", reward_credits: 20, estimated_minutes: 15, difficulty: "easy", verification_type: "auto", max_applicants: 5, tags: "hindi,proofreading,writing" },
    { posted_by: "platform", poster_type: "platform", title: "Create YouTube Thumbnail (3 designs)", description: "Design 3 YouTube thumbnail options for our channel. 1280x720px.", category: "creative", reward_credits: 40, estimated_minutes: 30, difficulty: "medium", verification_type: "photo_proof", max_applicants: 5, tags: "youtube,thumbnail,design" },
    { posted_by: "platform", poster_type: "platform", title: "Organize Books at Community Library", description: "Spend 1 hour organizing books at the nearest community library/reading room", category: "community", reward_credits: 30, estimated_minutes: 60, difficulty: "easy", location_type: "local", verification_type: "photo_proof", max_applicants: 5, tags: "library,books,community" },
    { posted_by: "platform", poster_type: "platform", title: "Beta Test: Food Ordering Flow", description: "Complete 3 test orders on food.digitalrohtak.online and report any issues", category: "digital", reward_credits: 25, estimated_minutes: 20, difficulty: "easy", verification_type: "self_report", max_applicants: 10, tags: "testing,food,beta" },
    { posted_by: "platform", poster_type: "platform", title: "Teach Computer Basics (1 hour)", description: "Teach basic computer skills (typing, browser, email) to someone who doesn't know", category: "peer_help", reward_credits: 45, estimated_minutes: 60, difficulty: "easy", verification_type: "photo_proof", max_applicants: 10, tags: "computer,teaching,basics" },
    { posted_by: "platform", poster_type: "platform", title: "Photography: 10 Best Spots in Rohtak", description: "Take 10 high-quality photos of interesting places in Rohtak. Min 1080p.", category: "creative", reward_credits: 50, estimated_minutes: 60, difficulty: "medium", verification_type: "photo_proof", max_applicants: 5, tags: "photography,rohtak,places" },
    { posted_by: "platform", poster_type: "platform", title: "Fill 20 Survey Forms (Market Research)", description: "Get 20 people to fill a short survey about their shopping habits", category: "digital", reward_credits: 55, estimated_minutes: 90, difficulty: "hard", verification_type: "auto", max_applicants: 10, tags: "survey,market-research,data" },
  ]

  for (const task of moreTasks) {
    try { await taskService.postTask(task) } catch (e: any) { /* skip duplicates */ }
  }
  console.log(`  ✓ ${moreTasks.length} additional tasks added`)

  // ── Additional Rewards (12 more) ───────────────────────────────────────
  console.log("  → Adding 12 more rewards...")
  const moreRewards = [
    { title: "Jio 2GB Daily Pack (7 days)", category: "data_pack", credit_cost: 80, retail_value: 99, stock_total: 50, delivery_type: "voucher" },
    { title: "Airtel 1.5GB Daily (28 days)", category: "data_pack", credit_cost: 200, retail_value: 249, stock_total: 20, delivery_type: "voucher" },
    { title: "Netflix Mobile Plan (1 week)", category: "streaming", credit_cost: 100, retail_value: 99, stock_total: 30, delivery_type: "voucher" },
    { title: "Amazon Prime Video (3 days)", category: "streaming", credit_cost: 50, retail_value: 49, stock_total: 40, delivery_type: "digital" },
    { title: "Swiggy ₹75 Off Coupon", category: "food", credit_cost: 80, retail_value: 75, stock_total: 25, delivery_type: "voucher" },
    { title: "Dominos ₹100 Off (Min ₹300)", category: "food", credit_cost: 110, retail_value: 100, stock_total: 20, delivery_type: "voucher" },
    { title: "Valorant 475 VP", category: "gaming", credit_cost: 90, retail_value: 89, stock_total: 30, delivery_type: "digital" },
    { title: "Coursera 1-Month Access", category: "education", credit_cost: 250, retail_value: 299, stock_total: 10, delivery_type: "voucher" },
    { title: "Myntra ₹200 Voucher", category: "fashion", credit_cost: 180, retail_value: 200, stock_total: 15, delivery_type: "voucher" },
    { title: "Flipkart ₹150 Gift Card", category: "fashion", credit_cost: 140, retail_value: 150, stock_total: 20, delivery_type: "voucher" },
    { title: "Hotstar 1-Week Mobile", category: "streaming", credit_cost: 60, retail_value: 49, stock_total: 40, delivery_type: "digital" },
    { title: "Local Gym 1-Day Pass", category: "experience", credit_cost: 40, retail_value: 50, stock_total: 30, delivery_type: "voucher" },
  ]

  for (const reward of moreRewards) {
    try { await rewardsService.addReward(reward) } catch (e: any) { /* skip */ }
  }
  console.log(`  ✓ ${moreRewards.length} additional rewards added`)

  // ── Create Sample Teen Users with Wallets ──────────────────────────────
  console.log("  → Creating 5 sample teen users...")
  const sampleTeens = [
    { id: "teen_rahul_16m", name: "Rahul Sharma" },
    { id: "teen_priya_15f", name: "Priya Verma" },
    { id: "teen_amit_17m", name: "Amit Kumar" },
    { id: "teen_neha_14f", name: "Neha Singh" },
    { id: "teen_vikram_16m", name: "Vikram Malik" },
  ]

  for (const teen of sampleTeens) {
    try {
      await walletService.getOrCreateWallet(teen.id)
      await gamificationService.getOrCreateUserLevel(teen.id)
      await currencyService.getOrCreateAccount(teen.id)
    } catch (e: any) { /* skip if exists */ }
  }
  console.log("  ✓ 5 teen users created with wallets")

  // ── Simulate some activity for demo ────────────────────────────────────
  console.log("  → Simulating activity for demo users...")

  // Give Rahul some credits (simulating completed tasks)
  try {
    await walletService.creditWallet({ user_id: "teen_rahul_16m", amount: 150, reference_type: "task", description: "Completed: Create Instagram Story" })
    await walletService.creditWallet({ user_id: "teen_rahul_16m", amount: 40, reference_type: "task", description: "Completed: Park Cleanup Drive" })
    await gamificationService.recordTaskCompletion("teen_rahul_16m", 5)
    await gamificationService.recordTaskCompletion("teen_rahul_16m", 4)
    await gamificationService.recordTaskCompletion("teen_rahul_16m", 5)
    await gamificationService.updateStreak("teen_rahul_16m")
  } catch (e: any) { console.log(`    Rahul: ${e.message}`) }

  // Give Priya some credits
  try {
    await walletService.creditWallet({ user_id: "teen_priya_15f", amount: 100, reference_type: "task", description: "Completed: Math Tutoring" })
    await walletService.creditWallet({ user_id: "teen_priya_15f", amount: 60, reference_type: "task", description: "Completed: Teach English" })
    await gamificationService.recordTaskCompletion("teen_priya_15f", 5)
    await gamificationService.recordTaskCompletion("teen_priya_15f", 5)
    await gamificationService.updateStreak("teen_priya_15f")
  } catch (e: any) { console.log(`    Priya: ${e.message}`) }

  // Give Amit some credits
  try {
    await walletService.creditWallet({ user_id: "teen_amit_17m", amount: 75, reference_type: "task", description: "Completed: Data Entry" })
    await gamificationService.recordTaskCompletion("teen_amit_17m", 4)
    await gamificationService.updateStreak("teen_amit_17m")
  } catch (e: any) { console.log(`    Amit: ${e.message}`) }

  console.log("  ✓ Activity simulated")

  // ── Summary ────────────────────────────────────────────────────────────
  const totalTasks = await taskService.listTasks({})
  const totalRewards = await rewardsService.listRewards({})
  const totalWallets = await walletService.listWallets({})

  console.log("\n✅ Extended Sample Data Seeded!")
  console.log(`   Tasks: ${totalTasks.length} | Rewards: ${totalRewards.length} | Wallets: ${totalWallets.length}`)
  console.log("\n📋 Sample Users for E2E Testing:")
  console.log("   teen_rahul_16m  — 190 BRT, 3 tasks done, Level 2")
  console.log("   teen_priya_15f  — 160 BRT, 2 tasks done")
  console.log("   teen_amit_17m   — 75 BRT, 1 task done")
  console.log("   teen_neha_14f   — 0 BRT (fresh user)")
  console.log("   teen_vikram_16m — 0 BRT (fresh user)")
}
