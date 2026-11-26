import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { chatGptModels } from "./CodexChatGptModels.ts";

it.effect("returns the native model list without calling the OpenAI models API", () =>
  Effect.gen(function* () {
    const native = [
      {
        slug: "first",
        name: "Cached first",
        isCustom: false,
        capabilities: { optionDescriptors: [] },
      },
      { slug: "other", name: "Cached other", isCustom: false, capabilities: null },
    ];
    const models = yield* chatGptModels("account-a", native);
    assert.deepEqual(models, native);
  }),
);
