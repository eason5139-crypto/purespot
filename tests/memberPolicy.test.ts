import { describe, it, expect } from "vitest";
import {
  DEFAULT_TIERS,
  addCalendarMonths,
  evaluateCycle,
  memberPolicySchema,
  priceForMember,
  qualifyingSpend,
  type MemberCycle,
} from "@/lib/memberPolicy";
const policy = {
  periodMonths: 6 as const,
  activatedAt: "2026-11-23T00:00:00.000Z",
  tiers: DEFAULT_TIERS,
};
const now = new Date("2026-11-23T00:00:00Z");
const order = (totalNt: number, status = "COMPLETED") => ({
  createdAt: "2026-10-10T00:00:00Z",
  totalNt,
  shippingNt: 80,
  status,
});
const cycle = (
  tierCode: MemberCycle["tierCode"],
  expiresAt = "2026-12-01T00:00:00Z",
): MemberCycle => ({ tierCode, startsAt: "2026-06-01T00:00:00Z", expiresAt });
describe("six-month membership", () => {
  it("validates exactly five ascending tiers", () => {
    expect(memberPolicySchema.safeParse(policy).success).toBe(true);
    expect(
      memberPolicySchema.safeParse({
        ...policy,
        tiers: DEFAULT_TIERS.slice(0, 3),
      }).success,
    ).toBe(false);
  });
  it("clamps calendar month ends", () =>
    expect(
      addCalendarMonths(new Date("2026-08-31T10:00:00Z"), 6).toISOString(),
    ).toBe("2027-02-28T10:00:00.000Z"));
  it("counts completed merchandise only inside the window", () =>
    expect(
      qualifyingSpend(
        [
          order(1080),
          order(2000, "CANCELLED"),
          { ...order(5000), createdAt: "2025-01-01" },
        ],
        new Date("2026-05-23"),
        now,
      ),
    ).toBe(1000));
  it("holds the tier before expiry even when older spend rolls out", () =>
    expect(evaluateCycle(policy, cycle("GOLD"), [], now).current.code).toBe(
      "GOLD",
    ));
  it("upgrades immediately and starts six months of protection", () => {
    const r = evaluateCycle(policy, cycle("MEMBER"), [order(10080)], now);
    expect(r.current.code).toBe("GOLD");
    expect(r.cycle.expiresAt).toBe("2027-05-23T00:00:00.000Z");
  });
  it("renews using lower retention threshold", () =>
    expect(
      evaluateCycle(policy, cycle("GOLD", "2026-11-22"), [order(6080)], now)
        .current.code,
    ).toBe("GOLD"));
  it("cannot upgrade using a retention threshold", () =>
    expect(
      evaluateCycle(policy, cycle("SILVER", "2026-11-22"), [order(7080)], now)
        .current.code,
    ).toBe("SILVER"));
  it("steps down to a qualifying retained level rather than resetting", () =>
    expect(
      evaluateCycle(policy, cycle("DIAMOND", "2026-11-22"), [order(7080)], now)
        .current.code,
    ).toBe("GOLD"));
  it("chooses autoship or member price without multiplying discounts", () => {
    expect(priceForMember(1000, false, DEFAULT_TIERS[4]!)).toBe(930);
    expect(priceForMember(1000, true, DEFAULT_TIERS[4]!)).toBe(900);
  });
});
