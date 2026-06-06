/** @jest-environment node */
import { createSearchLogger } from "../search-logger";
import { InProcSlidingWindow } from "../rate-limiter";
import type { PendingSearchEvent } from "../types";

function makeEvent(overrides: Partial<PendingSearchEvent> = {}): PendingSearchEvent {
  return {
    visitorId: "12345678-1234-4abc-89ab-1234567890ab",
    queryText: "biryani",
    queryTruncated: false,
    cuisine: null,
    resultRestaurantIds: ["sc_1"],
    resultCount: 1,
    matchReasonBreakdown: { name: 1 },
    userAgent: "Mozilla/5.0",
    locale: "en-US",
    sourceIpHash: "a".repeat(64),
    ...overrides,
  };
}

function fakeClient(impl: Partial<{ query: jest.Mock; end: jest.Mock }> = {}) {
  return {
    query: impl.query ?? jest.fn().mockResolvedValue({ rowCount: 1 }),
    end: impl.end ?? jest.fn().mockResolvedValue(undefined),
  };
}

async function settle() {
  // let setImmediate + microtasks resolve
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  await Promise.resolve();
}

describe("SearchLogger", () => {
  it("inserts one row on the happy path", async () => {
    const c = fakeClient();
    const rl = new InProcSlidingWindow({ rVid: 100, rIp: 100 });
    const logFn = jest.fn();
    const logger = createSearchLogger({
      pgClientFactory: () => c,
      rateLimiter: rl,
      isOptedOut: () => false,
      logFn,
    });
    logger.log(makeEvent());
    await settle();
    expect(c.query).toHaveBeenCalledTimes(1);
    expect(logFn).toHaveBeenCalled();
  });

  it("skips the insert and emits dropped_optout when opt-out returns true", async () => {
    const c = fakeClient();
    const rl = new InProcSlidingWindow({ rVid: 100, rIp: 100 });
    const logFn = jest.fn();
    const logger = createSearchLogger({
      pgClientFactory: () => c,
      rateLimiter: rl,
      isOptedOut: () => true,
      logFn,
    });
    logger.log(makeEvent());
    await settle();
    expect(c.query).not.toHaveBeenCalled();
    expect(logFn.mock.calls.some((args) => /dropped_optout/.test(args[0]))).toBe(true);
  });

  it("skips the insert and emits dropped_ratelimit when the limiter rejects", async () => {
    const c = fakeClient();
    const rl = new InProcSlidingWindow({ rVid: 1, rIp: 100 });
    const logFn = jest.fn();
    const logger = createSearchLogger({
      pgClientFactory: () => c,
      rateLimiter: rl,
      isOptedOut: () => false,
      logFn,
    });
    logger.log(makeEvent());
    logger.log(makeEvent());
    await settle();
    expect(c.query).toHaveBeenCalledTimes(1);
    expect(logFn.mock.calls.some((args) => /dropped_ratelimit/.test(args[0]))).toBe(true);
  });

  it("emits dropped_error and does not throw on persistent insert failure", async () => {
    const c = fakeClient({ query: jest.fn().mockRejectedValue(new Error("boom")) });
    const rl = new InProcSlidingWindow({ rVid: 100, rIp: 100 });
    const logFn = jest.fn();
    const logger = createSearchLogger({
      pgClientFactory: () => c,
      rateLimiter: rl,
      isOptedOut: () => false,
      logFn,
    });
    logger.log(makeEvent());
    await settle();
    expect(logFn.mock.calls.some((args) => /dropped_error/.test(args[0]))).toBe(true);
  });

  it("log() returns synchronously (void) regardless of insert delay", () => {
    const c = fakeClient({
      query: jest.fn(() => new Promise((r) => setTimeout(r, 10_000))),
    });
    const rl = new InProcSlidingWindow({ rVid: 100, rIp: 100 });
    const logger = createSearchLogger({
      pgClientFactory: () => c,
      rateLimiter: rl,
      isOptedOut: () => false,
      logFn: () => undefined,
    });
    const t0 = Date.now();
    logger.log(makeEvent());
    const dt = Date.now() - t0;
    expect(dt).toBeLessThan(100);
  });
});
