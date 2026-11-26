import { expect, it } from "@effect/vitest";
import { ServerNpmReleaseError } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";

import * as NpmRelease from "./npmRelease.ts";

it.effect("never looks up releases in the self-use build", () =>
  Effect.gen(function* () {
    const service = yield* NpmRelease.make();
    expect(yield* service.get({ spec: "latest" })).toBeNull();
    expect(yield* service.get({ spec: "nightly" })).toBeNull();
    expect(yield* service.get({ spec: "1.2.3" })).toBeNull();
  }),
);

it.effect("still rejects invalid release specs", () =>
  Effect.gen(function* () {
    const service = yield* NpmRelease.make();
    const found = yield* service.get({ spec: "../other" }).pipe(Effect.result);
    expect(Result.isFailure(found)).toBe(true);
    if (Result.isFailure(found)) {
      expect(found.failure).toBeInstanceOf(ServerNpmReleaseError);
    }
  }),
);
