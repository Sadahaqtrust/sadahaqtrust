/**
 * In-process sliding-window rate limiter.
 * See design.md §Rate Limiter Design.
 *
 * Phase 1 impl is a per-process Map<key, number[]> of admission timestamps.
 * `now` is injectable so tests can drive the clock deterministically.
 */
import type { RateDecision } from "./types";

export interface RateLimiter {
  allow(visitorId: string, ipHash: string): RateDecision;
}

export type InProcSlidingWindowOptions = {
  rVid: number;
  rIp: number;
  windowMs?: number;
  now?: () => number;
};

export class InProcSlidingWindow implements RateLimiter {
  private readonly vidHits = new Map<string, number[]>();
  private readonly ipHits = new Map<string, number[]>();
  private readonly rVid: number;
  private readonly rIp: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(opts: InProcSlidingWindowOptions) {
    this.rVid = opts.rVid;
    this.rIp = opts.rIp;
    this.windowMs = opts.windowMs ?? 60_000;
    this.now = opts.now ?? (() => Date.now());
  }

  allow(visitorId: string, ipHash: string): RateDecision {
    const t = this.now();
    const cutoff = t - this.windowMs;
    // Check and provisionally accept against the per-visitor domain first.
    if (!this.check(this.vidHits, visitorId, cutoff, this.rVid)) {
      return { ok: false, reason: "visitor" };
    }
    if (!this.check(this.ipHits, ipHash, cutoff, this.rIp)) {
      // Roll back the vid admission we just made to keep accounting exact.
      const arr = this.vidHits.get(visitorId);
      if (arr && arr.length > 0) arr.pop();
      return { ok: false, reason: "ip" };
    }
    // Record ip admission.
    this.admit(this.ipHits, ipHash, t);
    return { ok: true };
  }

  /** Drops expired entries and, when capacity allows, admits `t`. */
  private check(
    m: Map<string, number[]>,
    key: string,
    cutoff: number,
    cap: number,
  ): boolean {
    const arr = m.get(key) ?? [];
    let i = 0;
    while (i < arr.length && arr[i] < cutoff) i++;
    const fresh = i === 0 ? arr : arr.slice(i);
    if (fresh.length >= cap) {
      m.set(key, fresh);
      return false;
    }
    fresh.push(this.now());
    m.set(key, fresh);
    return true;
  }

  private admit(m: Map<string, number[]>, key: string, t: number): void {
    // check() already pushed for its map; this helper is unused publicly but
    // keeps the symmetry obvious in the code.
    void m;
    void key;
    void t;
  }

  /** Test-only helper: expose current admission count for a vid. */
  _visitorAdmissions(visitorId: string): number {
    return this.vidHits.get(visitorId)?.length ?? 0;
  }

  /** Test-only helper: expose current admission count for an ip hash. */
  _ipAdmissions(ipHash: string): number {
    return this.ipHits.get(ipHash)?.length ?? 0;
  }
}
