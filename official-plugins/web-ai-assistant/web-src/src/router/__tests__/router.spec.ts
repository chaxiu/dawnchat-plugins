import { afterEach, describe, expect, it } from "vitest";

import { router } from "../index";
import { getDefaultWebAssistantViewPath } from "../../runtime/viewRegistry";

describe("web assistant router", () => {
  afterEach(async () => {
    await router.push(getDefaultWebAssistantViewPath());
  });

  it("redirects the root route to the default assistant home view", async () => {
    await router.push("/");
    await router.isReady();

    expect(router.currentRoute.value.fullPath).toBe(getDefaultWebAssistantViewPath());
  });
});
