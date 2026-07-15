import { IFRAME_UI_AGENT_MESSAGE, TASK_LEDGER_HOST_INVOKE } from "@dawnchat/host-orchestration-sdk/assistant-client";
import { createDesktopHostTaskStore } from "../task/createDesktopHostTaskStore";

describe("createDesktopHostTaskStore", () => {
  const originalParent = window.parent;

  afterEach(() => {
    Object.defineProperty(window, "parent", {
      value: originalParent,
      configurable: true,
    });
  });

  it("lists tasks through host invoke", async () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, "parent", {
      value: {
        postMessage,
      },
      configurable: true,
    });
    const store = createDesktopHostTaskStore();
    const pending = store.listTasks({ limit: 5 });
    expect(postMessage).toHaveBeenCalledTimes(1);
    const [message] = postMessage.mock.calls[0];
    expect(message.type).toBe(IFRAME_UI_AGENT_MESSAGE.HOST_INVOKE_REQUEST);
    expect(message.payload.functionName).toBe(TASK_LEDGER_HOST_INVOKE.LIST_TASKS);
    expect(message.payload.payload).toEqual({ limit: 5 });
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: IFRAME_UI_AGENT_MESSAGE.HOST_INVOKE_RESULT,
          requestId: message.requestId,
          result: {
            ok: true,
            data: [
              {
                task_id: "task-1",
                template_id: "general.task",
                title: "Test Task",
                status: "draft",
                updated_at_ms: 1,
              },
            ],
          },
        },
      })
    );
    await expect(pending).resolves.toEqual([
      {
        task_id: "task-1",
        template_id: "general.task",
        title: "Test Task",
        summary: undefined,
        status: "draft",
        updated_at_ms: 1,
        last_active_surface_id: undefined,
      },
    ]);
  });
});
