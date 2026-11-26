import { makeUnavailableUsageLimits } from "@t3tools/provider-core/server/usageLimits";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

// Self-use build: usage-limit probing is disabled so T3 never reads OpenCode
// credential files (auth.json, the credential database) or stored API keys.
export const readOpenCodeGoUsageLimits = Effect.fn("readOpenCodeGoUsageLimits")(function* (_input: {
  readonly enabled: boolean;
  readonly serverUrl: string;
  readonly environment: NodeJS.ProcessEnv;
}) {
  const checkedAt = DateTime.formatIso(yield* DateTime.now);
  return makeUnavailableUsageLimits({ checkedAt, reason: "unsupported" });
});
