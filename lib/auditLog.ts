import { NextRequest } from "next/server";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

// ── Types ──────────────────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  user_id: string;
  email: string | null;
  action_type: string;
  action_details: object;
  ip_address: string;
  device_details: object;
  hostname: string | null;
  timestamp: string;
  status: string;
  error_message: string | null;
}

// ── Dedicated audit pool (separate from pgdb route's pool) ────────
const auditPool = new Pool({
  host: "127.0.0.1",
  port: 5432,
  user: "medusa_user",
  password: "Saanvi02052016@",
  database: "medusa_digitalrohtak",
  max: 3,
});

// ── Table initialization flag ─────────────────────────────────────
let tableInitialized = false;

// ── extractIP ─────────────────────────────────────────────────────
export function extractIP(req: NextRequest): string {
  // Priority: x-forwarded-for → x-real-ip → 'unknown'
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

// ── parseDeviceDetails ────────────────────────────────────────────
export function parseDeviceDetails(req: NextRequest): object {
  const ua = req.headers.get("user-agent");

  if (!ua) {
    return { raw: "unknown", browser: "unknown", os: "unknown", deviceType: "unknown" };
  }

  // Browser detection
  let browser = "unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  // OS detection — iOS must come before macOS (iOS UA contains "Mac OS X")
  let os = "unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  // Device type detection
  let deviceType: string = "desktop";
  if (/Tablet|iPad/i.test(ua)) deviceType = "tablet";
  else if (/Mobile|iPhone|Android.*Mobile/i.test(ua)) deviceType = "mobile";

  return { raw: ua, browser, os, deviceType };
}

// ── initAuditTable ────────────────────────────────────────────────
export async function initAuditTable(): Promise<void> {
  if (tableInitialized) return;

  try {
    await auditPool.query(`
      CREATE TABLE IF NOT EXISTS user_activity_audit_log (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL DEFAULT 'anonymous',
        email VARCHAR(255),
        action_type VARCHAR(100) NOT NULL,
        action_details JSONB DEFAULT '{}',
        ip_address VARCHAR(45) NOT NULL DEFAULT 'unknown',
        device_details JSONB DEFAULT '{}',
        hostname VARCHAR(255),
        "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status VARCHAR(20) NOT NULL DEFAULT 'success',
        error_message TEXT
      );
    `);

    await auditPool.query(`CREATE INDEX IF NOT EXISTS idx_audit_user_id ON user_activity_audit_log (user_id);`);
    await auditPool.query(`CREATE INDEX IF NOT EXISTS idx_audit_action_type ON user_activity_audit_log (action_type);`);
    await auditPool.query(`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON user_activity_audit_log ("timestamp");`);
    await auditPool.query(`CREATE INDEX IF NOT EXISTS idx_audit_user_timestamp ON user_activity_audit_log (user_id, "timestamp");`);

    tableInitialized = true;
  } catch (err) {
    console.error("[AUDIT] Table init failed:", err);
  }
}

// ── writeAuditEntry ───────────────────────────────────────────────
export async function writeAuditEntry(entry: AuditEntry): Promise<void> {
  // Ensure table exists on first write
  await initAuditTable();

  const sql = `
    INSERT INTO user_activity_audit_log
      (id, user_id, email, action_type, action_details, ip_address, device_details, hostname, "timestamp", status, error_message)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `;
  const params = [
    entry.id,
    entry.user_id,
    entry.email,
    entry.action_type,
    JSON.stringify(entry.action_details),
    entry.ip_address,
    JSON.stringify(entry.device_details),
    entry.hostname,
    entry.timestamp,
    entry.status,
    entry.error_message,
  ];

  // Retry up to 3 times with exponential backoff
  const delays = [100, 200, 400];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      await auditPool.query(sql, params);
      return; // success
    } catch (err) {
      if (attempt < delays.length) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
      } else {
        // All retries exhausted — fallback to file
        try {
          const fallbackDir = path.join(process.cwd(), "data");
          if (!existsSync(fallbackDir)) {
            mkdirSync(fallbackDir, { recursive: true });
          }
          const fallbackFile = path.join(fallbackDir, "audit-fallback.json");

          let existing: AuditEntry[] = [];
          if (existsSync(fallbackFile)) {
            try {
              existing = JSON.parse(readFileSync(fallbackFile, "utf-8"));
            } catch {
              existing = [];
            }
          }
          existing.push(entry);
          writeFileSync(fallbackFile, JSON.stringify(existing, null, 2));
        } catch (fileErr) {
          console.error("[AUDIT_CRITICAL]", JSON.stringify(entry), fileErr);
        }
      }
    }
  }
}

// ── logAudit (main entry point) ───────────────────────────────────
export function logAudit(
  req: NextRequest,
  actionType: string,
  actionDetails: object = {},
  userId?: string,
  email?: string,
  status: string = "success"
): void {
  const entry: AuditEntry = {
    id: randomUUID(),
    user_id: userId || "anonymous",
    email: email || null,
    action_type: actionType,
    action_details: actionDetails,
    ip_address: extractIP(req),
    device_details: parseDeviceDetails(req),
    hostname: req.headers.get("host") || null,
    timestamp: new Date().toISOString(),
    status,
    error_message: null,
  };

  // Fire-and-forget — do not await
  writeAuditEntry(entry).catch((err) => {
    console.error("[AUDIT] Unexpected error in writeAuditEntry:", err);
  });
}
