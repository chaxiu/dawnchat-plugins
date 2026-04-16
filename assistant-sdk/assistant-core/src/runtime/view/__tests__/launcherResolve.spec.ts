import { describe, expect, it } from "vitest";

import { ASSISTANT_LAUNCHER_ROUTE } from "../assistantNavigationRoutes";
import { filterRegistrationsForLauncher, resolveLauncherIconComponent } from "../launcherResolve";
import type { ViewRegistration } from "../manifest";

function mockRegistration(partial: Partial<ViewRegistration> & { view_id: string }): ViewRegistration {
  const path = partial.view_id.replace(/\./g, "/");
  return {
    view_id: partial.view_id,
    binding_type: partial.binding_type || "test.binding",
    title: partial.title || partial.view_id,
    component: partial.component || ({} as ViewRegistration["component"]),
    render_mode: partial.render_mode || "light-dom",
    style_texts: partial.style_texts || [],
    theme_vars: partial.theme_vars || [],
    route: partial.route || {
      path,
      name: `view-${partial.view_id.replace(/\./g, "-")}`,
      full_path: `/views/${path}`,
    },
    state_mode: partial.state_mode || "lightweight",
    default_state_binding: partial.default_state_binding || {
      binding_type: "test",
      data: {},
    },
    anchors: partial.anchors || [],
    capabilities: partial.capabilities || [],
    getStateSummary: partial.getStateSummary || (() => ({})),
  };
}

describe("resolveLauncherIconComponent", () => {
  it("returns mapped icon for core view ids", () => {
    expect(resolveLauncherIconComponent("board.main")).toBeTruthy();
    expect(resolveLauncherIconComponent("plane.main")).toBeTruthy();
  });

  it("falls back for unknown ids", () => {
    const a = resolveLauncherIconComponent("unknown.view");
    const b = resolveLauncherIconComponent("other.view");
    expect(a).toBe(b);
  });
});

describe("filterRegistrationsForLauncher", () => {
  it("removes launcher route and sorts by title", () => {
    const regs = [
      mockRegistration({
        view_id: "zeta.main",
        title: "Zeta",
      }),
      mockRegistration({
        view_id: "alpha.main",
        title: "Alpha",
      }),
      mockRegistration({
        view_id: "fake.launcher",
        title: "Launcher",
        route: {
          path: "launcher",
          name: "launcher",
          full_path: ASSISTANT_LAUNCHER_ROUTE,
        },
      }),
    ];
    const filtered = filterRegistrationsForLauncher(regs);
    expect(filtered.map((r) => r.view_id)).toEqual(["alpha.main", "zeta.main"]);
  });
});
