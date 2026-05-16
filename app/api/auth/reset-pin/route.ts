import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { logAudit } from "@/lib/auditLog";

const TOKENS_DIR = path.join(process.cwd(), "data", "reset-tokens");

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false, error: "No token provided" });
  }

  const tokenFile = path.join(TOKENS_DIR, `${token}.json`);
  if (!existsSync(tokenFile)) {
    return NextResponse.json({ valid: false, error: "Invalid or expired link" });
  }

  try {
    const data = JSON.parse(readFileSync(tokenFile, "utf-8"));
    if (data.used) {
      return NextResponse.json({ valid: false, error: "This link has already been used" });
    }
    if (Date.now() > data.expires) {
      unlinkSync(tokenFile);
      return NextResponse.json({ valid: false, error: "This link has expired. Please request a new one." });
    }
    return NextResponse.json({ valid: true, email: data.email });
  } catch {
    return NextResponse.json({ valid: false, error: "Invalid token" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, pin } = await req.json();

    if (!token || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "Valid token and 4-digit PIN required" }, { status: 400 });
    }

    const tokenFile = path.join(TOKENS_DIR, `${token}.json`);
    if (!existsSync(tokenFile)) {
      logAudit(req, 'PIN_RESET_FAILURE', { reason: 'Invalid or expired link' }, undefined, undefined, 'failure');
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    const data = JSON.parse(readFileSync(tokenFile, "utf-8"));
    if (data.used) {
      logAudit(req, 'PIN_RESET_FAILURE', { email: data.email, reason: 'Link already used' }, undefined, undefined, 'failure');
      return NextResponse.json({ error: "This link has already been used" }, { status: 400 });
    }
    if (Date.now() > data.expires) {
      unlinkSync(tokenFile);
      logAudit(req, 'PIN_RESET_FAILURE', { email: data.email, reason: 'Link expired' }, undefined, undefined, 'failure');
      return NextResponse.json({ error: "This link has expired" }, { status: 400 });
    }

    // Hash the PIN using scrypt-kdf via the medusa-backend's node_modules
    // This ensures we use the exact same library and params as Medusa
    const medusaDir = "/home/sadahaqtrust/medusa-backend";
    const hashCmd = `cd ${medusaDir} && node -e "const S=require('scrypt-kdf');S.kdf('${pin}',{logN:15,r:8,p:1}).then(h=>console.log(h.toString('base64')))"`;
    const passwordHash = execSync(hashCmd, { timeout: 30000 }).toString().trim();

    if (!passwordHash || !passwordHash.startsWith("c2NyeXB0")) {
      logAudit(req, 'PIN_RESET_FAILURE', { email: data.email, reason: 'Failed to hash PIN' }, undefined, undefined, 'failure');
      return NextResponse.json({ error: "Failed to hash PIN" }, { status: 500 });
    }

    // Update in PostgreSQL
    const updateCmd = `PGPASSWORD='Saanvi02052016@' psql -h 127.0.0.1 -U medusa_user -d medusa_digitalrohtak -t -c "UPDATE provider_identity SET provider_metadata = jsonb_build_object('password', '${passwordHash}') WHERE entity_id = '${data.email}' RETURNING entity_id;"`;
    const updateResult = execSync(updateCmd, { timeout: 10000 }).toString().trim();

    if (!updateResult.includes(data.email)) {
      logAudit(req, 'PIN_RESET_FAILURE', { email: data.email, reason: 'Account not found' }, undefined, undefined, 'failure');
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Mark token as used
    data.used = true;
    writeFileSync(tokenFile, JSON.stringify(data));

    // Audit log — success
    logAudit(req, 'PIN_RESET_SUCCESS', { email: data.email });

    return NextResponse.json({ success: true, message: "PIN updated successfully" });
  } catch (err: any) {
    console.error("Reset PIN error:", err.message);
    logAudit(req, 'PIN_RESET_FAILURE', { reason: err.message }, undefined, undefined, 'failure');
    return NextResponse.json({ error: "Failed to reset PIN" }, { status: 500 });
  }
}
