import { afterEach, describe, expect, it } from "vitest";

import { router } from "../index";
import { ROUTE_PATHS } from "../routes";

describe("web assistant router", () => {
  afterEach(async () => {
    await router.push(ROUTE_PATHS.launcher);
  });

  it("redirects the root route to the launcher page", async () => {
    await router.push("/");
    await router.isReady();

    expect(router.currentRoute.value.fullPath).toBe(ROUTE_PATHS.launcher);
  });
});
