import { describe, expect, it } from "bun:test";

import { buildGreeting } from "../entry/tutor_runtime";

describe("buildGreeting", () => {
  it("returns default greeting when name is empty", () => {
    expect(buildGreeting("")).toBe("Hello, World!");
  });

  it("trims user input", () => {
    expect(buildGreeting("  DawnChat  ")).toBe("Hello, DawnChat!");
  });
});
