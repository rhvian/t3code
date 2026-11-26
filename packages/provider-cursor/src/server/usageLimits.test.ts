import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import { cursorUsageResponseToLimits, readCursorUsageLimits } from "./usageLimits.ts";

describe("Cursor usage limits", () => {
  const checkedAt = "2026-09-16T00:00:00.000Z";

  it("uses the advertised percentages and billing-cycle reset", () => {
    const limits = cursorUsageResponseToLimits(
      {
        billingCycleEnd: "1789876386000",
        planUsage: { totalPercentUsed: 72.4, autoPercentUsed: 69.5, apiPercentUsed: 100 },
      },
      checkedAt,
    );
    expect(limits.windows).toEqual(
      expect.arrayContaining([
        {
          id: "totalPercentUsed",
          kind: "monthly",
          label: "Overall",
          usedPercent: 72.4,
          resetsAt: "2026-09-20T03:53:06.000Z",
        },
        {
          id: "autoPercentUsed",
          kind: "monthly",
          label: "Cursor Models",
          usedPercent: 69.5,
          resetsAt: "2026-09-20T03:53:06.000Z",
        },
        {
          id: "apiPercentUsed",
          kind: "monthly",
          label: "Other Models",
          usedPercent: 100,
          resetsAt: "2026-09-20T03:53:06.000Z",
        },
      ]),
    );
  });

  it("reports the billing-cycle length so pace can be computed", () => {
    const planUsage = { totalPercentUsed: 40, autoPercentUsed: 30, apiPercentUsed: 20 };
    const durations = (billingCycleStart: string | number | undefined, billingCycleEnd: string) =>
      cursorUsageResponseToLimits(
        { billingCycleStart, billingCycleEnd, planUsage },
        checkedAt,
      ).windows.map((window) => window.windowDurationMins);
    expect(durations("1794045847072", "1796637847072")).toEqual([43_200, 43_200, 43_200]);
    expect(durations(1_796_637_847_072, "1799316247072")).toEqual([44_640, 44_640, 44_640]);
  });

  it("omits the cycle length when the start is missing or invalid", () => {
    for (const billingCycleStart of [undefined, "", "0", "not-a-number", "1796637847072"]) {
      expect(
        cursorUsageResponseToLimits(
          {
            billingCycleStart,
            billingCycleEnd: "1796637847072",
            planUsage: { totalPercentUsed: 40 },
          },
          checkedAt,
        ).windows,
      ).toEqual([
        {
          id: "totalPercentUsed",
          kind: "monthly",
          label: "Overall",
          usedPercent: 40,
          resetsAt: "2026-12-07T10:04:07.072Z",
        },
      ]);
    }
  });

  it("retains unified totals for account aggregation", () => {
    const windows = cursorUsageResponseToLimits(
      { planUsage: { totalPercentUsed: 1.77, autoPercentUsed: 1.77 } },
      checkedAt,
    ).windows;
    expect(windows.map((window) => window.id)).toEqual(["autoPercentUsed", "totalPercentUsed"]);
    expect(
      cursorUsageResponseToLimits(
        { planUsage: { totalPercentUsed: 100, apiPercentUsed: 100 } },
        checkedAt,
      ).windows.map((window) => window.id),
    ).toEqual(["apiPercentUsed", "totalPercentUsed"]);
  });

  it("does not invent unused allowance for absent buckets", () => {
    expect(cursorUsageResponseToLimits({ planUsage: {} }, checkedAt).unavailable?.reason).toBe(
      "unsupported",
    );
    expect(
      cursorUsageResponseToLimits({ planUsage: { totalPercentUsed: 0 } }, checkedAt).windows,
    ).toEqual([{ id: "totalPercentUsed", kind: "monthly", label: "Overall", usedPercent: 0 }]);
    expect(
      cursorUsageResponseToLimits({ planUsage: { totalPercentUsed: 150 } }, checkedAt).windows,
    ).toEqual([{ id: "totalPercentUsed", kind: "monthly", label: "Overall", usedPercent: 100 }]);
  });

  it.effect("never probes usage or touches credentials in the self-use build", () =>
    Effect.gen(function* () {
      for (const environment of [
        {},
        { CURSOR_AUTH_TOKEN: "explicit-token" },
        { CURSOR_API_KEY: "api-key" },
        { CURSOR_API_ENDPOINT: "https://cursor-proxy.example", CURSOR_API_KEY: "api-key" },
      ]) {
        const limits = yield* readCursorUsageLimits({ apiEndpoint: "" }, environment).pipe(
          Effect.provideService(
            HttpClient.HttpClient,
            HttpClient.make(() => Effect.die("usage probing is disabled")),
          ),
        );
        expect(limits.unavailable?.reason).toBe("unsupported");
      }
    }),
  );
});
