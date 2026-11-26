import type { ServerProviderUsageWindow } from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  clampPercent,
  makeUnavailableUsageLimits,
  makeUsageLimits,
} from "@t3tools/provider-core/server/usageLimits";

export const GROK_USAGE_URL = "https://cli-chat-proxy.grok.com/v1/billing?format=credits";
export const GrokUsageResponse = Schema.Struct({
  config: Schema.optional(
    Schema.Struct({
      creditUsagePercent: Schema.optional(Schema.Number),
      currentPeriod: Schema.optional(
        Schema.Struct({
          type: Schema.optional(Schema.String),
          start: Schema.optional(Schema.Unknown),
          end: Schema.optional(Schema.String),
        }),
      ),
    }),
  ),
});

function parsePeriodBoundary(value: string | undefined) {
  if (
    !value ||
    value !== value.trim() ||
    !/^(?:\d{4}|[+-]\d{6})-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?|24:00(?::00(?:\.0+)?)?)(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      value,
    )
  ) {
    return Number.NaN;
  }
  // Date parsing can normalize impossible calendar dates instead of rejecting them.
  const datePart = value.slice(0, value.indexOf("T"));
  const date = DateTime.make(`${datePart}T00:00:00.000Z`);
  if (Option.isNone(date)) return Number.NaN;
  const parts = DateTime.toPartsUtc(date.value);
  if (parts.month !== Number(datePart.slice(-5, -3)) || parts.day !== Number(datePart.slice(-2))) {
    return Number.NaN;
  }
  return Date.parse(value);
}

export function grokUsageResponseToLimits(
  response: typeof GrokUsageResponse.Type,
  checkedAt: string,
) {
  const period = response.config?.currentPeriod;
  const periodType = period?.type?.replace(/^USAGE_PERIOD_TYPE_/, "");
  const kind = periodType === "WEEKLY" ? "weekly" : periodType === "MONTHLY" ? "monthly" : "other";
  const start = typeof period?.start === "string" ? parsePeriodBoundary(period.start) : NaN;
  const end = parsePeriodBoundary(period?.end);
  const windowDurationMins = Math.round((end - start) / 60_000);
  let usedPercent = response.config?.creditUsagePercent;
  if (usedPercent === undefined && (kind === "weekly" || kind === "monthly") && start < end) {
    // Grok omits a zero percentage while retaining the complete subscription period.
    usedPercent = 0;
  }
  if (usedPercent === undefined || !Number.isFinite(usedPercent)) {
    return makeUsageLimits({ checkedAt, windows: [] });
  }
  const reset = period?.end ? DateTime.make(period.end) : Option.none();
  const window: ServerProviderUsageWindow = {
    id: "subscription",
    kind,
    label: kind === "weekly" ? "Weekly" : kind === "monthly" ? "Monthly" : "Subscription",
    usedPercent: clampPercent(usedPercent),
    ...(Option.isSome(reset) ? { resetsAt: DateTime.formatIso(reset.value) } : {}),
    ...(windowDurationMins > 0 ? { windowDurationMins } : {}),
  };
  return makeUsageLimits({ checkedAt, windows: [window] });
}

// Self-use build: never read Grok credential files or call the billing API
// for a usage display.
export const readGrokAccount = Effect.fn("readGrokAccount")(function* (
  _environment: NodeJS.ProcessEnv = process.env,
) {
  const checkedAt = DateTime.formatIso(yield* DateTime.now);
  return {
    email: undefined,
    usageLimits: makeUnavailableUsageLimits({ checkedAt, reason: "unsupported" }),
  };
});
