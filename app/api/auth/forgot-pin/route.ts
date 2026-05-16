import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { logAudit } from "@/lib/auditLog";

const TOKENS_DIR = path.join(process.cwd(), "data", "reset-tokens");
const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// Gmail SMTP — uses app password
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER || "sadahaqtrust@gmail.com",
    pass: process.env.SMTP_PASS || "",
  },
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    // Check if customer exists in Medusa
    const MEDUSA_URL = process.env.MEDUSA_INTERNAL_URL || "http://127.0.0.1:9000";
    const checkRes = await fetch(`${MEDUSA_URL}/auth/customer/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "___check___" }),
    });

    // Medusa returns 401 for wrong password but the user exists
    // If user doesn't exist, it also returns 401 with "Invalid email or password"
    // We send the email regardless to prevent email enumeration attacks

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + TOKEN_EXPIRY_MS;

    // Store token
    if (!existsSync(TOKENS_DIR)) {
      mkdirSync(TOKENS_DIR, { recursive: true });
    }
    writeFileSync(
      path.join(TOKENS_DIR, `${token}.json`),
      JSON.stringify({ email: email.toLowerCase(), expires, used: false })
    );

    // Build reset link
    const host = req.headers.get("host") || "digitalrohtak.online";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const resetLink = `${protocol}://${host}/auth/reset-pin?token=${token}`;

    // Send email
    if (process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `"Digital Rohtak" <${process.env.SMTP_USER || "sadahaqtrust@gmail.com"}>`,
        to: email,
        subject: "Reset Your PIN — Digital Rohtak",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#F47216;">Reset Your PIN</h2>
            <p>You requested a PIN reset for your Digital Rohtak account.</p>
            <p>Click the button below to set a new 4-digit PIN:</p>
            <a href="${resetLink}" 
               style="display:inline-block;background:#00A650;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:16px;margin:16px 0;">
              Reset My PIN
            </a>
            <p style="color:#999;font-size:13px;">This link expires in 15 minutes.</p>
            <p style="color:#999;font-size:13px;">If you didn't request this, ignore this email.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="color:#aaa;font-size:12px;">Digital Rohtak · Sadahaq International</p>
          </div>
        `,
      });
    }

    // Audit log
    logAudit(req, 'FORGOT_PIN_REQUEST', { email });

    // Always return success (don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a reset link has been sent.",
    });
  } catch (err: any) {
    console.error("Forgot PIN error:", err.message);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
