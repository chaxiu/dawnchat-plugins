import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { resetTaskRuntimeState, setTaskRuntimeHandle } from "../../../../runtime";

import {
  installAssistantLauncherNavigation,
  resetLauncherContentExitForTests,
} from "../../../../runtime/view/launcherNavigation";

const openSpy = vi.fn().mockResolvedValue({ ok: true, data: {} });

vi.mock("../../../../runtime/view/runtime.open", () => ({
  openAssistantViewFromShell: (...args: unknown[]) => openSpy(...args),
}));

vi.mock("../../../../runtime/view/registry", () => ({
  listViewRegistrations: () => [
    {
      view_id: "board.main",
      binding_type: "board.workspace",
      title: "Board",
      component: defineComponent({ name: "StubBoard", setup: () => () => h("div") }),
      render_mode: "light-dom",
      style_texts: [],
      theme_vars: [],
      route: {
        path: "board/main",
        name: "view-board-main",
        full_path: "/views/board/main",
      },
      state_mode: "stateful",
      default_state_binding: { binding_type: "board.workspace", data: {} },
      anchors: [],
      capabilities: [],
      getStateSummary: () => ({}),
    },
  ],
}));

import AssistantLauncherPage from "../AssistantLauncherPage.vue";

describe("AssistantLauncherPage", () => {
  beforeEach(() => {
    resetLauncherContentExitForTests();
    resetTaskRuntimeState();
    setTaskRuntimeHandle(null);
  });

  it("navigates back to the last tracked content route on back click", async () => {
    const pushCalls: unknown[] = [];
    const Placeholder = defineComponent({ name: "RoutePlaceholder", template: "<div />" });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/views/launcher",
          name: "launcher",
          component: Placeholder,
        },
        { path: "/views/board/main", name: "board", component: Placeholder },
        { path: "/welcome", name: "welcome", component: Placeholder },
      ],
    });
    const originalPush = router.push.bind(router);
    vi.spyOn(router, "push").mockImplementation(async (to: unknown) => {
      pushCalls.push(to);
      return originalPush(to as never);
    });

    installAssistantLauncherNavigation(router);
    await router.push("/views/board/main");
    await router.push("/views/launcher");
    await nextTick();

    const wrapper = mount(AssistantLauncherPage, {
      global: {
        plugins: [router],
      },
      attachTo: document.body,
    });

    const back = wrapper.find(".assistant-launcher__back");
    expect(back.exists()).toBe(true);
    await back.trigger("click");
    expect(pushCalls.at(-1)).toEqual("/views/board/main");
    wrapper.unmount();
  });

  it("renders task-first sections and opens tools via view.open", async () => {
    openSpy.mockClear();
    const taskHandle = {
      listTasks: vi.fn().mockResolvedValue([
        {
          task_id: "task-1",
          template_id: "general.task",
          title: "Task One",
          summary: "Recent task",
          status: "draft",
          updated_at_ms: Date.now(),
        },
      ]),
      listTaskTemplates: vi.fn().mockResolvedValue([
        {
          template_id: "general.task",
          title: "General Task",
          description: "Start blank",
        },
      ]),
      createTask: vi.fn().mockResolvedValue({
        task_id: "task-2",
        template_id: "general.task",
        title: "New Task",
        status: "draft",
        created_at_ms: 1,
        updated_at_ms: 1,
        surface_workspace_refs: {},
      }),
      openTask: vi.fn().mockResolvedValue({
        task_id: "task-1",
        opened_view_id: "task.main",
        status: "opened",
      }),
      getCurrentTask: vi.fn(),
      getTask: vi.fn(),
      renameTask: vi.fn(),
      setTaskActiveSurface: vi.fn(),
      bindTaskWorkspace: vi.fn(),
      openWorkspaceForTask: vi.fn(),
    } as never;
    setTaskRuntimeHandle(taskHandle);

    const Placeholder = defineComponent({ name: "RoutePlaceholder", template: "<div />" });
    const router = createRouter({
      history: createMemoryHistory({ initialEntries: ["/views/launcher"] }),
      routes: [
        {
          path: "/views/launcher",
          name: "launcher",
          component: Placeholder,
        },
      ],
    });
    installAssistantLauncherNavigation(router);
    await router.push("/views/launcher");
    await nextTick();

    const wrapper = mount(AssistantLauncherPage, {
      global: {
        plugins: [router],
      },
      attachTo: document.body,
    });

    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain("Continue Tasks");
    expect(wrapper.text()).toContain("New Task");
    expect(wrapper.text()).toContain("Tools & Views");
    expect(wrapper.find(".assistant-launcher__back").exists()).toBe(false);

    const toolTile = wrapper.findAll(".assistant-launcher__tile").at(-1);
    expect(toolTile?.exists()).toBe(true);
    await toolTile!.trigger("click");
    expect(openSpy).toHaveBeenCalledWith("board.main");
    wrapper.unmount();
  });

  it("creates and opens a task from the template section", async () => {
    const taskHandle = {
      listTasks: vi.fn().mockResolvedValue([]),
      listTaskTemplates: vi.fn().mockResolvedValue([
        {
          template_id: "general.task",
          title: "General Task",
          description: "Start blank",
        },
      ]),
      createTask: vi.fn().mockResolvedValue({
        task_id: "task-2",
        template_id: "general.task",
        title: "New Task",
        status: "draft",
        created_at_ms: 1,
        updated_at_ms: 1,
        surface_workspace_refs: {},
      }),
      openTask: vi.fn().mockResolvedValue({
        task_id: "task-2",
        opened_view_id: "task.main",
        status: "opened",
      }),
      getCurrentTask: vi.fn(),
      getTask: vi.fn(),
      renameTask: vi.fn(),
      setTaskActiveSurface: vi.fn(),
      bindTaskWorkspace: vi.fn(),
      openWorkspaceForTask: vi.fn(),
    } as never;
    setTaskRuntimeHandle(taskHandle);

    const Placeholder = defineComponent({ name: "RoutePlaceholder", template: "<div />" });
    const router = createRouter({
      history: createMemoryHistory({ initialEntries: ["/views/launcher"] }),
      routes: [
        {
          path: "/views/launcher",
          name: "launcher",
          component: Placeholder,
        },
      ],
    });
    installAssistantLauncherNavigation(router);
    await router.push("/views/launcher");
    await nextTick();

    const wrapper = mount(AssistantLauncherPage, {
      global: {
        plugins: [router],
      },
      attachTo: document.body,
    });

    await Promise.resolve();
    await Promise.resolve();
    await nextTick();
    await nextTick();

    expect(taskHandle.listTaskTemplates).toHaveBeenCalled();

    const templateTile = wrapper
      .findAll(".assistant-launcher__tile")
      .find((candidate) => candidate.text().includes("General Task"));
    expect(templateTile?.exists()).toBe(true);
    await templateTile!.trigger("click");

    expect(taskHandle.createTask).toHaveBeenCalledWith({
      template_id: "general.task",
      title: "New Task",
    });
    expect(taskHandle.openTask).toHaveBeenCalledWith("task-2");
    wrapper.unmount();
  });
});
