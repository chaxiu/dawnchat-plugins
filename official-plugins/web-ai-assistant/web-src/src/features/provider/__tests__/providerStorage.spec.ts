import { describe, expect, it, beforeEach } from "vitest";

import {
  loadProviderConfig,
  normalizeProviderConfig,
  saveProviderConfig,
} from "../providerStorage";

describe("providerStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("normalizes partial configs with provider-specific defaults", () => {
    expect(normalizeProviderConfig({
      provider: "gemini",
      apiKey: "secret",
    })).toEqual({
      schemaVersion: 1,
      provider: "gemini",
      modelId: "gemini-2.5-flash",
      apiKey: "secret",
      baseURL: "",
      providerOptions: {},
      headers: {},
    });
  });

  it("persists and reloads provider configuration locally", () => {
    saveProviderConfig({
      schemaVersion: 1,
      provider: "openai",
      modelId: "gpt-4.1-mini",
      apiKey: "abc123",
      baseURL: "https://example.test/v1",
      providerOptions: {
        temperature: 0.2,
      },
      headers: {
        "x-test": "1",
      },
    });

    expect(loadProviderConfig()).toEqual({
      schemaVersion: 1,
      provider: "openai",
      modelId: "gpt-4.1-mini",
      apiKey: "abc123",
      baseURL: "https://example.test/v1",
      providerOptions: {
        temperature: 0.2,
      },
      headers: {
        "x-test": "1",
      },
    });
  });
});
