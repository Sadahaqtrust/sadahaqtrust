/**
 * BFF cache endpoint for user role lookups.
 *
 * The Next.js Edge middleware cannot use ioredis directly, so it calls this
 * Node.js Route Handler which has full access to the Redis connection.
 *
 * GET /api/user-role-cache?token={jwt}
 *   - Returns { role: "customer" | "seller" | "rider" } from cache, or {} if miss.
 *
 * POST /api/user-role-cache
 *   - Body: { token: string; role: string }
 *   - Stores the role in cache with a 60-second TTL.
 *
 * Both routes require the x-internal: "1" header (checked by middleware).
 * We also accept calls from the middleware itself which sets that header.
 */

import { NextRequest, NextResponse } from "next/server";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const ROLE_TTL_SECONDS = 60;

// Lazily import ioredis only when available; gracefully degrade otherwise.
// Using require() inside a try/catch to avoid TS2307 when ioredis is not
// installed — the module is optional and the code degrades to a no-op cache.
async function getRedis() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require("ioredis");
    const RedisClass = Redis.default ?? Redis;
    return new RedisClass(REDIS_URL) as {
      get(key: string): Promise<string | null>;
      set(key: string, value: string, mode: string, ttl: number): Promise<unknown>;
      quit(): Promise<unknown>;
    };
  } catch {
    return null;
  }
}

function cacheKey(token: string): string {
  // Use first 32 chars of token as a stable-enough key prefix to avoid
  // storing the full JWT in Redis key space.
  return `role:${token.slice(0, 32)}`;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  const redis = await getRedis();
  if (!redis) {
    // No Redis available — return cache miss
    return NextResponse.json({}, { status: 200 });
  }

  try {
    const cached = await redis.get(cacheKey(token));
    await redis.quit();
    if (cached) {
      return NextResponse.json({ role: cached }, { status: 200 });
    }
    return NextResponse.json({}, { status: 200 });
  } catch {
    try { await redis.quit(); } catch {}
    return NextResponse.json({}, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  let body: { token?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { token, role } = body;
  if (!token || !role) {
    return NextResponse.json({ error: "missing token or role" }, { status: 400 });
  }

  const redis = await getRedis();
  if (!redis) {
    return NextResponse.json({ cached: false }, { status: 200 });
  }

  try {
    await redis.set(cacheKey(token), role, "EX", ROLE_TTL_SECONDS);
    await redis.quit();
    return NextResponse.json({ cached: true }, { status: 200 });
  } catch {
    try { await redis.quit(); } catch {}
    return NextResponse.json({ cached: false }, { status: 200 });
  }
}
