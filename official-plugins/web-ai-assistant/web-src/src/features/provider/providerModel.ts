import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

import type { AssistantProviderConfig } from "./providerTypes";

export function createProviderModel(config: AssistantProviderConfig) {
  if (config.provider === "gemini") {
    const google = createGoogleGenerativeAI({
      apiKey: config.apiKey,
      headers: config.headers,
    });
    return google(config.modelId);
  }

  const openai = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL || undefined,
    headers: config.headers,
  });
  return openai(config.modelId);
}
