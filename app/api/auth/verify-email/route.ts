import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";

const TOKENS_DIR = path.join(process.cwd(), "data", "reset-tokens");
const OTP_EXPIRY_MS = 15 * 60 * 1000;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER || "sadahaqtrust@gmail.com",
    pass: process.env.SMTP_PASS || "",
  },
});

// POST — send OTP to email
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes("@"))
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });

    const otp = crypto.randomInt(100000, 999999).toString();
    const expires = Date.now() + OTP_EXPIRY_MS;

    if (!existsSync(TOKENS_DIR)) mkdirSync(TOKENS_DIR, { recursive: true });

    const key = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    writeFileSync(
      path.join(TOKENS_DIR, `otp_${key}.json`),
      JSON.stringify({ email: email.toLowerCase(), otp, expires, used: false })
    );

    if (process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `"Digital Rohtak" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Your OTP — Digital Rohtak Registration",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#F47216;">Verify Your Email</h2>
            <p>Your one-time verification code:</p>
            <div style="font-size:40px;font-weight:900;color:#00A650;letter-spacing:12px;margin:24px 0;text-align:center;">${otp}</div>
            <p style="color:#999;font-size:13px;">Expires in 15 minutes.</p>
            <p style="color:#e00;font-size:13px;">⚠️ Registering with someone else's mobile number without their consent is illegal.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="color:#aaa;font-size:12px;">Digital Rohtak · साद्दा हक़ इंटरनेशनल</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

// GET — verify OTP
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.toLowerCase();
  const otp = req.nextUrl.searchParams.get("otp");
  if (!email || !otp) return NextResponse.json({ valid: false, error: "Missing params" });

  const key = email.replace(/[^a-z0-9]/g, "_");
  const file = path.join(TOKENS_DIR, `otp_${key}.json`);
  if (!existsSync(file)) return NextResponse.json({ valid: false, error: "OTP not found or expired" });

  try {
    const data = JSON.parse(readFileSync(file, "utf-8"));
    if (data.used) return NextResponse.json({ valid: false, error: "OTP already used" });
    if (Date.now() > data.expires) return NextResponse.json({ valid: false, error: "OTP expired" });
    if (data.otp !== otp) return NextResponse.json({ valid: false, error: "Incorrect OTP" });
    data.used = true;
    writeFileSync(file, JSON.stringify(data));
    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false, error: "Invalid OTP" });
  }
}
