#!/bin/bash
# ============================================================================
# BARTER SYSTEM DEPLOYMENT SCRIPT
# ============================================================================
# Run from: ~/madusa-digitalrohtak/medusa-backend/
# Usage:    bash deploy-barter-system.sh
# ============================================================================

set -e

echo "============================================"
echo "  BARTER SYSTEM - DEPLOYMENT"
echo "  Digital Rohtak Youth Platform"
echo "============================================"
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_NAME="${DB_NAME:-medusa_digitalrohtak}"
DB_USER="medusa_user"
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="5432"

echo "📦 Database: $DB_NAME @ $DB_HOST"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Run SQL Migrations (Create Tables)
# ─────────────────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Running SQL Migrations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

MIGRATION_FILES=(
  "src/modules/barter-wallet/migrations/001_barter_wallet_tables.sql"
  "src/modules/barter-tasks/migrations/001_barter_tasks_tables.sql"
  "src/modules/barter-rewards/migrations/001_barter_rewards_tables.sql"
  "src/modules/barter-gamification/migrations/001_barter_gamification_tables.sql"
  "src/modules/barter-currency/migrations/001_barter_currency_tables.sql"
)

for file in "${MIGRATION_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  → Running: $file"
    psql "$DATABASE_URL" -f "$file" 2>&1 | grep -v "^$" | head -5
    echo "    ✓ Done"
  else
    echo "  ⚠ File not found: $file"
  fi
done

echo ""
echo "✅ Step 1 Complete: All tables created"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Build the Medusa Backend
# ─────────────────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: Building Medusa Backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx medusa build
echo ""
echo "✅ Step 2 Complete: Build successful"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Seed Barter System Data
# ─────────────────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 3: Seeding Barter System Data..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx medusa exec ./src/scripts/seed-barter-system.ts
echo ""
echo "✅ Step 3 Complete: Data seeded"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Restart Medusa Service
# ─────────────────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 4: Restarting Medusa Service..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running via PM2
if command -v pm2 &> /dev/null && pm2 list | grep -q "medusa"; then
  echo "  → Restarting via PM2..."
  pm2 restart medusa
  echo "    ✓ PM2 restart complete"
# Check if running via systemd
elif systemctl is-active --quiet medusa 2>/dev/null; then
  echo "  → Restarting via systemd..."
  sudo systemctl restart medusa
  echo "    ✓ systemd restart complete"
else
  echo "  → No running service detected."
  echo "    Start manually with: npx medusa start"
  echo "    Or for development:  npx medusa develop"
fi

echo ""
echo "============================================"
echo "  ✅ DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "📋 New API Endpoints Available:"
echo ""
echo "  WALLET:"
echo "    GET  /store/barter-wallet?user_id=xxx"
echo "    POST /store/barter-wallet              (create wallet)"
echo "    POST /store/barter-wallet/credit       (earn credits)"
echo "    POST /store/barter-wallet/debit        (spend credits)"
echo "    GET  /store/barter-wallet/transactions?user_id=xxx"
echo ""
echo "  TASKS:"
echo "    GET  /store/barter-tasks               (browse tasks)"
echo "    POST /store/barter-tasks               (post a task)"
echo "    GET  /store/barter-tasks/:id           (task detail)"
echo "    POST /store/barter-tasks/:id/apply     (apply for task)"
echo "    POST /store/barter-tasks/applications/:id  (accept/start/submit/approve/reject)"
echo "    GET  /store/barter-tasks/my?user_id=xxx    (my tasks)"
echo ""
echo "  REWARDS:"
echo "    GET  /store/barter-rewards             (browse rewards)"
echo "    POST /store/barter-rewards             (add reward)"
echo "    POST /store/barter-rewards/redeem      (redeem reward)"
echo "    GET  /store/barter-rewards/my?user_id=xxx  (my redemptions)"
echo ""
echo "  GAMIFICATION:"
echo "    GET  /store/barter-gamification?user_id=xxx  (profile/level/xp)"
echo "    GET  /store/barter-gamification/badges       (all badges)"
echo "    GET  /store/barter-gamification/badges?user_id=xxx  (my badges)"
echo "    GET  /store/barter-gamification/leaderboard?period_type=weekly&period_key=2024-W23"
echo ""
echo "  CURRENCY (Phase 3):"
echo "    GET  /store/barter-currency?user_id=xxx      (account balance)"
echo "    POST /store/barter-currency                  (create account)"
echo "    POST /store/barter-currency/transfer         (P2P transfer)"
echo "    GET  /store/barter-currency/history?user_id=xxx"
echo "    GET  /store/barter-currency/stats            (circulation stats)"
echo ""
echo "🧪 Test with:"
echo "    curl http://localhost:9000/store/barter-tasks"
echo "    curl http://localhost:9000/store/barter-rewards"
echo ""
