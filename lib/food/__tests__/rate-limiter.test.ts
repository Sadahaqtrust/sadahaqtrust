/** @jest-environment node */
import { InProcSlidingWindow } from "../rate-limiter";

describe("InProcSlidingWindow", () => {
  it("admits up to rVid per visitor, rejects the next", () => {
    let t = 0;
    const rl = new InProcSlidingWindow({ rVid: 3, rIp: 100, now: () => t });
    for (let i = 0; i < 3; i++) {
      expect(rl.allow("v1", "ip1")).toEqual({ ok: true });
      t += 10;
    }
    expect(rl.allow("v1", "ip1")).toEqual({ ok: false, reason: "visitor" });
  });

  it("admits up to rIp per IP hash, rejects the next with reason=ip", () => {
    let t = 0;
    const rl = new InProcSlidingWindow({ rVid: 100, rIp: 2, now: () => t });
    expect(rl.allow("v1", "ip1")).toEqual({ ok: true });
    t += 10;
    expect(rl.allow("v2", "ip1")).toEqual({ ok: true });
    t += 10;
    expect(rl.allow("v3", "ip1")).toEqual({ ok: false, reason: "ip" });
  });

  it("forgets admissions after the window", () => {
    let t = 0;
    const rl = new InProcSlidingWindow({
      rVid: 2,
      rIp: 100,
      windowMs: 1000,
      now: () => t,
    });
    expect(rl.allow("v1", "ip")).toEqual({ ok: true });
    t += 500;
    expect(rl.allow("v1", "ip")).toEqual({ ok: true });
    t += 600; // first admission now outside window
    expect(rl.allow("v1", "ip")).toEqual({ ok: true });
  });

  it("keeps per-visitor isolation", () => {
    let t = 0;
    const rl = new InProcSlidingWindow({ rVid: 1, rIp: 100, now: () => t });
    expect(rl.allow("a", "ipA")).toEqual({ ok: true });
    t += 10;
    expect(rl.allow("b", "ipB")).toEqual({ ok: true });
  });
});
