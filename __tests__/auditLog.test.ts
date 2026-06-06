// Mock pg so the Pool constructor doesn't run (avoids TextEncoder error in jsdom)
jest.mock("pg", () => ({ Pool: jest.fn() }));

import { extractIP, parseDeviceDetails } from "@/lib/auditLog";

// Minimal NextRequest mock
function mockReq(headers: Record<string, string>) {
  return { headers: { get: (k: string) => headers[k] ?? null } } as any;
}

describe("extractIP", () => {
  it("returns first IP from x-forwarded-for", () => {
    expect(extractIP(mockReq({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    expect(extractIP(mockReq({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("returns unknown when no headers", () => {
    expect(extractIP(mockReq({}))).toBe("unknown");
  });
});

describe("parseDeviceDetails", () => {
  it("returns unknown fields when no user-agent", () => {
    expect(parseDeviceDetails(mockReq({}))).toEqual({
      raw: "unknown", browser: "unknown", os: "unknown", deviceType: "unknown",
    });
  });

  it("detects Chrome on Windows desktop", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
    const result = parseDeviceDetails(mockReq({ "user-agent": ua })) as any;
    expect(result.browser).toBe("Chrome");
    expect(result.os).toBe("Windows");
    expect(result.deviceType).toBe("desktop");
    expect(result.raw).toBe(ua);
  });

  it("detects mobile device type", () => {
    const ua = "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36";
    const result = parseDeviceDetails(mockReq({ "user-agent": ua })) as any;
    expect(result.deviceType).toBe("mobile");
    expect(result.os).toBe("Android");
  });

  it("detects Safari on iOS", () => {
    const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
    const result = parseDeviceDetails(mockReq({ "user-agent": ua })) as any;
    expect(result.browser).toBe("Safari");
    expect(result.os).toBe("iOS");
    expect(result.deviceType).toBe("mobile");
  });
});
