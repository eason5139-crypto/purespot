import { describe, it, expect } from "vitest";
import {
  buyerTicket,
  DEFAULT_SUPPORT_SETTINGS,
  supportSettingsSchema,
  supportStatistics,
} from "@/lib/supportDesk";
import type { SupportThread } from "@/lib/supportTypes";
const ticket = (extra: Partial<SupportThread> = {}): SupportThread => ({
  id: "case",
  source: "CHAT",
  userId: "owner",
  clientToken: "private",
  buyerName: "買家",
  buyerEmail: "",
  memberTier: "MEMBER",
  memberTierLabel: "會員",
  tierPriority: 5,
  totalSpentNt: 0,
  ordersCount: 0,
  category: "ORDER",
  subject: "配送安排",
  status: "OPEN",
  orderId: null,
  petSummary: null,
  messages: [],
  createdAt: "2026-11-23T16:00:00Z",
  updatedAt: "2026-11-24T01:00:00Z",
  ...extra,
});
describe("support record boundaries and statistics", () => {
  it("has nine unique editable categories", () => {
    expect(
      supportSettingsSchema.parse(DEFAULT_SUPPORT_SETTINGS).categories,
    ).toHaveLength(9);
    expect(
      supportSettingsSchema.safeParse({
        ...DEFAULT_SUPPORT_SETTINGS,
        categories: Array(9).fill(DEFAULT_SUPPORT_SETTINGS.categories[0]),
      }).success,
    ).toBe(false);
  });
  it("never serializes internal notes, client tokens, logs or unknown private fields", () => {
    const t = {
      ...ticket(),
      internalNotes: [{ id: "n", body: "private", author: "staff", at: "now" }],
      activity: [],
      privateFuture: "secret",
    };
    const safe = buyerTicket(t);
    expect(safe).not.toHaveProperty("internalNotes");
    expect(safe).not.toHaveProperty("clientToken");
    expect(safe).not.toHaveProperty("activity");
    expect(safe).not.toHaveProperty("privateFuture");
  });
  it("uses Taipei dates and counts resolution separately from inquiry cohorts", () => {
    const rows = [
      ticket({
        id: "old",
        createdAt: "2026-10-01T00:00:00Z",
        status: "RESOLVED",
        resolvedAt: "2026-11-24T00:00:00Z",
      }),
      ticket({ id: "today" }),
    ];
    const s = supportStatistics(rows, "2026-11-24", "2026-11-24");
    expect(s.total).toBe(1);
    expect(s.closed).toBe(1);
    expect(s.days[0]).toEqual({ day: "2026-11-24", incoming: 1, closed: 1 });
    expect(s.categories.find((c) => c.id === "ORDER")?.count).toBe(1);
  });
  it("does not treat old updatedAt timestamps as resolution time", () => {
    const s = supportStatistics(
      [ticket({ status: "RESOLVED" })],
      "2026-11-24",
      "2026-11-24",
    );
    expect(s.closed).toBe(0);
    expect(s.resolutionMinutes).toBeNull();
    expect(s.missingResolution).toBe(1);
  });
  it("does not infer first response times from a legacy response mapped from updatedAt", () => {
    const s = supportStatistics(
      [
        ticket({
          source: "ORDER_REQUEST",
          messages: [
            {
              id: "case-m2",
              sender: "ADMIN",
              senderName: "客服",
              body: "舊回覆",
              createdAt: "2026-11-24T00:00:00Z",
            },
          ],
        }),
      ],
      "2026-11-24",
      "2026-11-24",
    );
    expect(s.responseSamples).toBe(0);
    expect(s.firstResponseMinutes).toBeNull();
  });
  it("computes first response, resolution and rating with their actual sample counts", () => {
    const s = supportStatistics(
      [
        ticket({
          createdAt: "2026-11-24T00:00:00Z",
          firstResponseAt: "2026-11-24T00:15:00Z",
          status: "RESOLVED",
          resolvedAt: "2026-11-24T01:00:00Z",
          feedback: { score: 4, comment: "", at: "2026-11-24T02:00:00Z" },
        }),
      ],
      "2026-11-24",
      "2026-11-24",
    );
    expect(s.firstResponseMinutes).toBe(15);
    expect(s.resolutionMinutes).toBe(60);
    expect(s.rating).toBe(4);
    expect(s.ratingCount).toBe(1);
  });
});
