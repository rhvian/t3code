import type { ServerProviderModel } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export class ChatGptCatalogError extends Schema.TaggedError<ChatGptCatalogError>()(
  "ChatGptCatalogError",
  { status: Schema.Int },
) {}

// Self-use build: never call the OpenAI models API with the account token;
// the native Codex model list is authoritative.
export const chatGptModels = Effect.fn("chatGptModels")(function* (
  _accessToken: string,
  nativeModels: ReadonlyArray<ServerProviderModel>,
) {
  return [...nativeModels];
});
