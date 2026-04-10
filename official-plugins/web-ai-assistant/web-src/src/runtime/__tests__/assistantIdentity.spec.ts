import { afterEach, describe, expect, it } from "vitest";

import {
  getWebAssistantIdentity,
  resetWebAssistantIdentityForTests,
} from "../assistantIdentity";

describe("assistantIdentity", () => {
  afterEach(() => {
    resetWebAssistantIdentityForTests();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("derives assistant instance and session from url params when present", () => {
    window.history.replaceState(
      {},
      "",
      "/preview?plugin_id=Plugin-A&session_id=Session-A"
    );

    const identity = getWebAssistantIdentity();

    expect(identity.assistantInstanceId).toBe("plugin-a");
    expect(identity.sessionId).toBe("session-a");
    expect(identity.persistenceScope).toBe("plugin-a::session.session-a");
  });

  it("reuses a session id from sessionStorage for the same assistant instance", () => {
    window.history.replaceState({}, "", "/preview?plugin_id=plugin-b");

    const firstIdentity = getWebAssistantIdentity();
    resetWebAssistantIdentityForTests();
    const secondIdentity = getWebAssistantIdentity();

    expect(secondIdentity.assistantInstanceId).toBe("plugin-b");
    expect(secondIdentity.sessionId).toBe(firstIdentity.sessionId);
    expect(secondIdentity.transcriptStorageKey).toBe(
      "dawnchat.web-ai-assistant.transcript.v1::plugin-b"
    );
  });
});
