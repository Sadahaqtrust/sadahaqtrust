import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * Register sample teen users with PIN 1977 for E2E testing.
 * These users can login via the storefront at digitalrohtak.online
 * 
 * Run: npx medusa exec ./src/scripts/register-barter-teens.ts
 * 
 * Login with:
 *   Mobile: 9876500001 → PIN: 1977
 *   Mobile: 9876500002 → PIN: 1977
 *   etc.
 */
export default async function registerBarterTeens({ container }: ExecArgs) {
  const authService = container.resolve(Modules.AUTH)
  const customerService = container.resolve(Modules.CUSTOMER)
  const walletService = container.resolve("barterWalletModuleService") as any
  const gamificationService = container.resolve("barterGamificationModuleService") as any
  const currencyService = container.resolve("barterCurrencyModuleService") as any

  const PIN = "1977"

  const teens = [
    { mobile: "9876500001", first_name: "Rahul", last_name: "Sharma", barter_id: "teen_rahul_16m" },
    { mobile: "9876500002", first_name: "Priya", last_name: "Verma", barter_id: "teen_priya_15f" },
    { mobile: "9876500003", first_name: "Amit", last_name: "Kumar", barter_id: "teen_amit_17m" },
    { mobile: "9876500004", first_name: "Neha", last_name: "Singh", barter_id: "teen_neha_14f" },
    { mobile: "9876500005", first_name: "Vikram", last_name: "Malik", barter_id: "teen_vikram_16m" },
  ]

  console.log("👥 Registering Barter Teen Users...")
  console.log(`   PIN for all: ${PIN}`)
  console.log("")

  for (const teen of teens) {
    const email = `91${teen.mobile}@digitalrohtak.online`
    console.log(`  → ${teen.first_name} ${teen.last_name} (${teen.mobile})`)

    try {
      // 1. Remove existing auth identity if any
      const existing = await authService.listAuthIdentities({
        provider_identities: { entity_id: email, provider: "emailpass" },
      } as any)
      for (const id of existing) {
        await authService.deleteAuthIdentities(id.id)
      }

      // 2. Register auth credentials
      const reg = await authService.register("emailpass", {
        body: { email, password: PIN },
      } as any)

      if (!reg.success || !reg.authIdentity) {
        console.log(`    ⚠ Auth register failed: ${reg.error}`)
        continue
      }

      // 3. Check if customer exists
      let customers = await customerService.listCustomers({ email: [email] })
      let customer: any

      if (customers.length > 0) {
        customer = customers[0]
        console.log(`    ✓ Customer exists: ${customer.id}`)
      } else {
        // Create customer
        customer = await customerService.createCustomers({
          email,
          first_name: teen.first_name,
          last_name: teen.last_name,
          phone: teen.mobile,
        })
        console.log(`    ✓ Customer created: ${customer.id}`)
      }

      // 4. Link auth identity to customer
      await authService.updateAuthIdentities([{
        id: reg.authIdentity.id,
        app_metadata: { customer_id: customer.id },
      }])

      // 5. Ensure barter wallet exists and link to customer ID
      // We use the customer.id as the barter user_id going forward
      try {
        await walletService.getOrCreateWallet(customer.id)
        await gamificationService.getOrCreateUserLevel(customer.id)
        await currencyService.getOrCreateAccount(customer.id)
      } catch (e: any) { /* already exists */ }

      // 6. Also ensure the old barter_id wallet has data migrated
      // Credit the customer wallet with same balance as the demo user
      try {
        const oldWallets = await walletService.listWallets({ user_id: [teen.barter_id] })
        if (oldWallets.length > 0) {
          const oldBalance = Number(oldWallets[0].balance) || 0
          if (oldBalance > 0) {
            await walletService.creditWallet({
              user_id: customer.id,
              amount: oldBalance,
              reference_type: "migration",
              description: `Migrated from ${teen.barter_id}`,
            })
            console.log(`    ✓ Migrated ${oldBalance} BRT from ${teen.barter_id}`)
          }
        }
      } catch (e: any) { /* skip */ }

      // 7. Copy gamification data
      try {
        const oldLevel = await gamificationService.listUserLevels({ user_id: [teen.barter_id] })
        if (oldLevel.length > 0) {
          const ol = oldLevel[0]
          const newLevel = await gamificationService.listUserLevels({ user_id: [customer.id] })
          if (newLevel.length > 0 && Number(ol.xp_total) > 0) {
            await gamificationService.updateUserLevels([{
              id: newLevel[0].id,
              xp_total: ol.xp_total,
              level: ol.level,
              level_name: ol.level_name,
              tasks_completed: ol.tasks_completed,
              current_streak_days: ol.current_streak_days,
              longest_streak_days: ol.longest_streak_days,
              last_active_date: ol.last_active_date,
              reputation_score: ol.reputation_score,
            }])
            console.log(`    ✓ Migrated gamification: Lv.${ol.level} ${ol.level_name}, ${ol.xp_total} XP`)
          }
        }
      } catch (e: any) { /* skip */ }

      console.log(`    ✓ Done: ${email} / PIN: ${PIN}`)
      console.log("")

    } catch (e: any) {
      console.log(`    ❌ Error: ${e.message}`)
      console.log("")
    }
  }

  console.log("═══════════════════════════════════════════════")
  console.log("  ✅ All teen users registered!")
  console.log("")
  console.log("  Login at: https://digitalrohtak.online/auth/login")
  console.log("")
  console.log("  ┌──────────────┬──────┬─────────────────────┐")
  console.log("  │ Mobile       │ PIN  │ Name                │")
  console.log("  ├──────────────┼──────┼─────────────────────┤")
  console.log("  │ 9876500001   │ 1977 │ Rahul Sharma        │")
  console.log("  │ 9876500002   │ 1977 │ Priya Verma         │")
  console.log("  │ 9876500003   │ 1977 │ Amit Kumar          │")
  console.log("  │ 9876500004   │ 1977 │ Neha Singh          │")
  console.log("  │ 9876500005   │ 1977 │ Vikram Malik        │")
  console.log("  └──────────────┴──────┴─────────────────────┘")
  console.log("")
}
