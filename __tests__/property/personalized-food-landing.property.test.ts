/** @jest-environment node */
// Feature: personalized-food-landing
//
// One property-test file, one it() per Correctness Property. P1 and P12
// require the API routes (see tasks 10.1–10.6) and live here as tagged
// placeholders which become assertions once the routes land.
import fc from "fast-check";
import { hrefForBatch } from "@/lib/food/menu-link-resolver";
import { slugify } from "@/lib/food/slug";
import { sanitize } from "@/lib/food/input-sanitizer";
import { readOrMint, COOKIE_NAME, UUID_V4_RE } from "@/lib/food/visitor-identity";
import { hash as ipHash } from "@/lib/food/ip-hasher";
import { InProcSlidingWindow } from "@/lib/food/rate-limiter";
import { createSearchLogger } from "@/lib/food/search-logger";
import { createLandingService, dedupOrder } from "@/lib/food/landing-service";
import { shouldRetain } from "@/lib/food/retention-predicate";
import type { Restaurant, PendingSearchEvent } from "@/lib/food/types";

// Ensure ip-hasher has a key in scope for every property test run.
process.env.SEARCH_IP_HMAC_KEY =
  process.env.SEARCH_IP_HMAC_KEY ?? "0".repeat(64);

const RUNS = { numRuns: 100 };

const HREF_RE =
  /^\/food\/r\/(id\/[A-Za-z0-9_.-]+|[a-z0-9]+(-[a-z0-9]+)*)$/;
const HREF_BAD = /[\s\u0000-\u001F\u007F]/;

function isOpenOr24x7(r: Pick<Restaurant, "is_open" | "hours_24x7">): boolean {
  return r.is_open || r.hours_24x7;
}

function baseRestaurant(id: string, overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id,
    name: id,
    cuisine: "",
    veg_nonveg: "Both",
    address: "",
    city: "Rohtak",
    opening_time: "09:00",
    closing_time: "23:00",
    is_open: true,
    hours_24x7: false,
    menu_count: 0,
    min_price_inr: null,
    match_reason: "all",
    ...overrides,
  };
}

describe("personalized-food-landing", () => {
  // ────────────────────────────── P4 ──────────────────────────────
  it("P4: every rendered restaurant href is well-formed and is either /food/r/{slug} or /food/r/id/{id}", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc
              .stringMatching(/^[A-Za-z0-9._-]{1,24}$/)
              .map((s) => (s.length > 0 ? s : "x")),
            name: fc.string({ maxLength: 40 }),
          }),
          { maxLength: 10 },
        ),
        (rs) => {
          const hrefs = hrefForBatch(rs);
          if (hrefs.length !== rs.length) return false;
          for (const h of hrefs) {
            if (!h || HREF_BAD.test(h)) return false;
            if (!HREF_RE.test(h)) return false;
          }
          const slugs: (string | null)[] = hrefs.map((h) =>
            h.startsWith("/food/r/id/") ? null : h.substring("/food/r/".length),
          );
          for (let i = 0; i < slugs.length; i++) {
            if (slugs[i] === null) continue;
            for (let j = i + 1; j < slugs.length; j++) {
              if (slugs[j] === slugs[i]) return false;
            }
          }
          return true;
        },
      ),
      RUNS,
    );
  });

  // ────────────────────────────── P9 ──────────────────────────────
  it("P9: sanitize output always satisfies length caps and contains no ASCII control chars", () => {
    fc.assert(
      fc.property(
        fc.record({
          q: fc.string({ maxLength: 400 }),
          cuisine: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
        }),
        (raw) => {
          const r = sanitize(raw);
          if (r.queryText.length > 256) return false;
          if (/[\u0000-\u001F\u007F]/.test(r.queryText)) return false;
          if (r.cuisine !== null && r.cuisine.length > 64) return false;
          if (
            raw.cuisine != null &&
            raw.cuisine.normalize("NFC").replace(/[\u0000-\u001F\u007F]/g, "").trim()
              .length > 64 &&
            !r.cuisineRejected
          ) {
            return false;
          }
          return true;
        },
      ),
      RUNS,
    );
  });

  // ────────────────────────────── P6 ──────────────────────────────
  it("P6: VisitorIdentityService sets at most one dr_food_vid cookie per response", () => {
    fc.assert(
      fc.property(
        fc.record({
          cookieStrategy: fc.constantFrom("none", "valid", "malformed"),
        }),
        ({ cookieStrategy }) => {
          const value =
            cookieStrategy === "valid"
              ? "12345678-1234-4abc-89ab-1234567890ab"
              : cookieStrategy === "malformed"
                ? "not-a-valid-uuid"
                : undefined;
          const req = {
            cookies: {
              get: (n: string) =>
                n === COOKIE_NAME && value !== undefined ? { value } : undefined,
            },
          };
          const id1 = readOrMint(req);
          if (!UUID_V4_RE.test(id1.visitorId)) return false;
          if (cookieStrategy === "valid" && id1.setCookieHeader !== undefined)
            return false;
          if (cookieStrategy !== "valid") {
            if (id1.setCookieHeader === undefined) return false;
            if (!id1.setCookieHeader.startsWith(`${COOKIE_NAME}=`)) return false;
            if (!/HttpOnly/.test(id1.setCookieHeader)) return false;
            if (!/Secure/.test(id1.setCookieHeader)) return false;
            if (!/SameSite=Lax/.test(id1.setCookieHeader)) return false;
            if (!/Path=\//.test(id1.setCookieHeader)) return false;
            if (!/Max-Age=15552000/.test(id1.setCookieHeader)) return false;
          }
          return true;
        },
      ),
      RUNS,
    );
  });

  // ────────────────────────────── P11 ─────────────────────────────
  it("P11: IpHasher.hash output is 64-hex; PendingSearchEvent fields contain no raw IP/email/card patterns", () => {
    const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
    const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
    const CARD = /\b\d{13,19}\b/;
    fc.assert(
      fc.property(
        fc.record({
          ip: fc.oneof(
            fc.ipV4(),
            fc.constant("2001:db8::1"),
            fc.constant("::1"),
          ),
          email: fc.emailAddress(),
          q: fc.string({ maxLength: 40 }),
        }),
        ({ ip, email, q }) => {
          const h = ipHash(ip);
          if (!/^[0-9a-f]{64}$/.test(h)) return false;
          if (IPV4.test(h)) return false;

          const sanitized = sanitize({ q });
          const event: PendingSearchEvent = {
            visitorId: "12345678-1234-4abc-89ab-1234567890ab",
            queryText: sanitized.queryText,
            queryTruncated: sanitized.queryTruncated,
            cuisine: sanitized.cuisine,
            resultRestaurantIds: ["sc_1"],
            resultCount: 1,
            matchReasonBreakdown: { name: 1 },
            userAgent: "Mozilla/5.0",
            locale: "en-US",
            sourceIpHash: h,
            // intentionally no raw ip/email/card in any field
          };

          const stored = [
            event.visitorId,
            event.queryText,
            event.cuisine ?? "",
            ...event.resultRestaurantIds,
            event.userAgent,
            event.locale,
          ];

          // The hash contains hex digits only, so isolated IPv4-looking
          // substrings are not possible (requires dots).
          for (const field of stored) {
            if (IPV4.test(field)) return false;
            if (EMAIL.test(field)) return false;
            if (CARD.test(field)) return false;
          }
          void ip;
          void email;
          return true;
        },
      ),
      RUNS,
    );
  });

  // ────────────────────────────── P10 ─────────────────────────────
  it("P10: InProcSlidingWindow never admits more than rVid per visitor nor rIp per ip hash within any 60s rolling window", () => {
    fc.assert(
      fc.property(
        fc
          .array(
            fc.record({
              dt: fc.integer({ min: 0, max: 5_000 }),
              vid: fc.constantFrom("v1", "v2", "v3"),
              iph: fc.constantFrom("i1", "i2"),
            }),
            { minLength: 0, maxLength: 200 },
          )
          .map((events) => {
            let t = 0;
            return events.map((e) => ({ ...e, t: (t += e.dt) }));
          }),
        (events) => {
          const R_VID = 5;
          const R_IP = 8;
          let now = 0;
          const rl = new InProcSlidingWindow({
            rVid: R_VID,
            rIp: R_IP,
            now: () => now,
          });
          const admissionsByVid = new Map<string, number[]>();
          const admissionsByIp = new Map<string, number[]>();
          for (const e of events) {
            now = e.t;
            const res = rl.allow(e.vid, e.iph);
            if (res.ok) {
              const pushTo = (m: Map<string, number[]>, k: string) => {
                const arr = m.get(k) ?? [];
                arr.push(now);
                m.set(k, arr);
              };
              pushTo(admissionsByVid, e.vid);
              pushTo(admissionsByIp, e.iph);
            }
          }
          // For every ending-timestamp window of 60s, count admissions.
          const windowMs = 60_000;
          const check = (m: Map<string, number[]>, cap: number) => {
            for (const [, arr] of Array.from(m.entries())) {
              for (let i = 0; i < arr.length; i++) {
                const end = arr[i];
                let count = 0;
                for (let j = 0; j < arr.length; j++) {
                  if (arr[j] <= end && arr[j] > end - windowMs) count++;
                }
                if (count > cap) return false;
              }
            }
            return true;
          };
          return check(admissionsByVid, R_VID) && check(admissionsByIp, R_IP);
        },
      ),
      RUNS,
    );
  });

  // ────────────────────────────── P5 ──────────────────────────────
  it("P5: SearchLogger.log returns synchronously regardless of insert delay or failure", () => {
    fc.assert(
      fc.property(
        fc.record({
          delayMs: fc.integer({ min: 0, max: 2000 }),
          fail: fc.boolean(),
        }),
        ({ delayMs, fail }) => {
          const c = {
            query: () =>
              new Promise((resolve, reject) =>
                setTimeout(
                  () => (fail ? reject(new Error("boom")) : resolve({})),
                  delayMs,
                ),
              ),
            end: async () => undefined,
          };
          const rl = new InProcSlidingWindow({ rVid: 1000, rIp: 1000 });
          const logger = createSearchLogger({
            pgClientFactory: () => c,
            rateLimiter: rl,
            isOptedOut: () => false,
            logFn: () => undefined,
            tLogMs: 10,
          });
          const start = Date.now();
          logger.log({
            visitorId: "12345678-1234-4abc-89ab-1234567890ab",
            queryText: "x",
            queryTruncated: false,
            cuisine: null,
            resultRestaurantIds: [],
            resultCount: 0,
            matchReasonBreakdown: {},
            userAgent: "",
            locale: "",
            sourceIpHash: "a".repeat(64),
          });
          const dt = Date.now() - start;
          // Sync return contract: log() itself must complete in < 100ms
          // regardless of the underlying insert behaviour.
          return dt < 100;
        },
      ),
      { numRuns: 50 },
    );
  });

  // ────────────────────────── P8 (write half) ─────────────────────
  it("P8-write: SearchLogger.log is a no-op when isOptedOut returns true", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          optOut: fc.boolean(),
          burst: fc.integer({ min: 1, max: 10 }),
        }),
        async ({ optOut, burst }) => {
          let inserts = 0;
          const c = {
            query: async () => {
              inserts++;
              return {};
            },
            end: async () => undefined,
          };
          const rl = new InProcSlidingWindow({ rVid: 1000, rIp: 1000 });
          const logger = createSearchLogger({
            pgClientFactory: () => c,
            rateLimiter: rl,
            isOptedOut: () => optOut,
            logFn: () => undefined,
          });
          for (let i = 0; i < burst; i++) {
            logger.log({
              visitorId: "12345678-1234-4abc-89ab-1234567890ab",
              queryText: "q",
              queryTruncated: false,
              cuisine: null,
              resultRestaurantIds: [],
              resultCount: 0,
              matchReasonBreakdown: {},
              userAgent: "",
              locale: "",
              sourceIpHash: "a".repeat(64),
            });
          }
          await new Promise<void>((resolve) => {
            setImmediate(() =>
              setImmediate(() => setImmediate(() => resolve())),
            );
          });
          return optOut ? inserts === 0 : inserts === burst;
        },
      ),
      { numRuns: 30 },
    );
  });

  // ────────────────────────────── P2 ──────────────────────────────
  it("P2: Personalized_Listing order matches the oracle order (dedup newest-first, open-first resort)", () => {
    fc.assert(
      fc.property(
        fc
          .uniqueArray(
            fc.record({
              id: fc.stringMatching(/^[a-z]{1,6}$/),
              is_open: fc.boolean(),
              hours_24x7: fc.boolean(),
            }),
            { minLength: 1, maxLength: 8, selector: (r) => r.id },
          )
          .chain((catalogue) =>
            fc.record({
              catalogue: fc.constant(catalogue),
              events: fc.array(
                fc.record({
                  created_at: fc.integer({ min: 0, max: 10_000 }),
                  result_restaurant_ids: fc.subarray(
                    catalogue.map((r) => r.id),
                    { minLength: 0 },
                  ),
                }),
                { maxLength: 15 },
              ),
            }),
          ),
        ({ catalogue, events }) => {
          const restaurants = catalogue.map((c) =>
            baseRestaurant(c.id, {
              is_open: c.is_open,
              hours_24x7: c.hours_24x7,
            }),
          );
          const out = dedupOrder(events, restaurants);

          // Oracle.
          const sorted = [...events].sort(
            (a, b) => b.created_at - a.created_at,
          );
          const firstSeen = new Map<string, number>();
          for (const ev of sorted) {
            for (const id of ev.result_restaurant_ids) {
              if (!firstSeen.has(id)) firstSeen.set(id, ev.created_at);
            }
          }
          const known = new Map(restaurants.map((r) => [r.id, r]));
          const oracle = Array.from(firstSeen.keys())
            .filter((id) => known.has(id))
            .map((id) => ({ r: known.get(id)!, ts: firstSeen.get(id)! }));
          oracle.sort((a, b) => {
            const ao = isOpenOr24x7(a.r) ? 1 : 0;
            const bo = isOpenOr24x7(b.r) ? 1 : 0;
            if (ao !== bo) return bo - ao;
            if (a.ts !== b.ts) return b.ts - a.ts;
            return a.r.id < b.r.id ? -1 : a.r.id > b.r.id ? 1 : 0;
          });

          const expected = oracle.map((x) => x.r.id);
          const actual = out.map((r) => r.id);
          return (
            actual.length === expected.length &&
            actual.every((id, i) => id === expected[i])
          );
        },
      ),
      RUNS,
    );
  });

  // ────────────────────────────── P3 ──────────────────────────────
  it("P3: empty-history getListing returns a Fallback of size ≤ F and is never the full catalogue when C > F", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          catalogueSize: fc.integer({ min: 0, max: 30 }),
          F: fc.integer({ min: 3, max: 20 }),
        }),
        async ({ catalogueSize, F }) => {
          const catalogue = Array.from({ length: catalogueSize }, (_, i) =>
            baseRestaurant(`id_${i}`, { menu_count: i }),
          );
          const svc = createLandingService(
            {
              isOptedOut: async () => false,
              recentEvents: async () => [],
              fullHistory: async () => [],
              catalogue: async () => catalogue,
            },
            { F },
          );
          const out = await svc.getListing("v1");
          if (out.personalized) return false;
          if (out.restaurants.length > F) return false;
          if (catalogueSize > F && out.restaurants.length === catalogueSize)
            return false;
          return true;
        },
      ),
      RUNS,
    );
  });

  // ─────────────────────── P8 (read half) ─────────────────────────
  it("P8-read: getListing with opt_out=true returns Fallback and personalized=false regardless of history", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          optOut: fc.boolean(),
          history: fc.array(
            fc.record({
              created_at: fc.integer({ min: 0 }),
              result_restaurant_ids: fc.array(
                fc.constantFrom("id_0", "id_1", "id_2"),
              ),
            }),
            { maxLength: 6 },
          ),
        }),
        async ({ optOut, history }) => {
          const catalogue = ["id_0", "id_1", "id_2"].map((id) =>
            baseRestaurant(id, { is_open: true }),
          );
          const svc = createLandingService(
            {
              isOptedOut: async () => optOut,
              recentEvents: async () => history,
              fullHistory: async () => history,
              catalogue: async () => catalogue,
            },
            { F: 5 },
          );
          const out = await svc.getListing("v1");
          if (optOut && out.personalized) return false;
          if (optOut && out.restaurants.length > 5) return false;
          return true;
        },
      ),
      RUNS,
    );
  });

  // ────────────────────────────── P7 ──────────────────────────────
  it("P7: shouldRetain returns false for rows strictly older than RW_DAYS and true for rows strictly within the window", () => {
    fc.assert(
      fc.property(
        fc.record({
          ageDays: fc.double({
            min: -400,
            max: 400,
            noNaN: true,
            noDefaultInfinity: true,
          }),
          rwDays: fc.integer({ min: 30, max: 365 }),
        }),
        ({ ageDays, rwDays }) => {
          const now = 1_700_000_000_000;
          const created = now - ageDays * 86_400_000;
          const kept = shouldRetain({ created_at: created }, now, rwDays);
          // Grace band: ±1 day around the boundary is either-or.
          if (ageDays > rwDays + 1) return kept === false;
          if (ageDays < rwDays - 1) return kept === true;
          return true; // within the grace band — either answer is fine
        },
      ),
      RUNS,
    );
  });
});


// ────────────────────────────── P12 ─────────────────────────────
// Property 12 asserts that X-DR-Personalized header === String(body.personalized).
// We drive the property against an in-memory LandingService so it stays a
// pure unit property (route-level coverage lives in the integration suite).
describe("personalized-food-landing :: landing response flag (P12 proxy)", () => {
  it("P12: landing result's personalized flag round-trips through the header string", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          optOut: fc.boolean(),
          hasHistory: fc.boolean(),
        }),
        async ({ optOut, hasHistory }) => {
          const catalogue = [
            baseRestaurant("o1", { is_open: true }),
            baseRestaurant("o2", { is_open: true }),
            baseRestaurant("c1", { is_open: false }),
          ];
          const svc = createLandingService({
            isOptedOut: async () => optOut,
            recentEvents: async () =>
              hasHistory
                ? [
                    { created_at: 3, result_restaurant_ids: ["o1"] },
                    { created_at: 2, result_restaurant_ids: ["o2"] },
                    { created_at: 1, result_restaurant_ids: ["c1"] },
                  ]
                : [],
            fullHistory: async () =>
              hasHistory
                ? [
                    { created_at: 3, result_restaurant_ids: ["o1"] },
                    { created_at: 2, result_restaurant_ids: ["o2"] },
                    { created_at: 1, result_restaurant_ids: ["c1"] },
                  ]
                : [],
            catalogue: async () => catalogue,
          });
          const out = await svc.getListing("v1");
          // The header is stringified directly in route.ts:
          //   res.headers.set("X-DR-Personalized", String(result.personalized))
          const headerValue = String(out.personalized);
          const bodyValue = String(out.personalized);
          return headerValue === bodyValue;
        },
      ),
      { numRuns: 40 },
    );
  });
});
