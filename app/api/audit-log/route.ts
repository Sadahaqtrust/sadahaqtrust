import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/auditLog";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action_type, action_details, user_id, email, client_device } = body;

    if (!action_type) {
      return NextResponse.json(
        { error: "action_type is required" },
        { status: 400 }
      );
    }

    // Merge client_device into action_details so it gets stored
    const enrichedDetails = {
      ...(action_details || {}),
      ...(client_device ? { client_device } : {}),
    };

    logAudit(req, action_type, enrichedDetails, user_id, email);

    return NextResponse.json({ queued: true }, { status: 202 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
