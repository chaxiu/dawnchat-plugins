import { describe, expect, it, vi } from "vitest";

vi.mock("../../../runtime/tools/webAssistantHostToolDefinitions", () => ({
  listWebAssistantToolDefinitions: () => [
    {
      name: "view.capability.invoke",
      description: "Invoke one capability on the active assistant view.",
    },
    {
      name: "assistant.view.describe",
      description: "Describe the active assistant view state.",
    },
  ],
}));

import {
  getWebAssistantLabels,
  toWebAssistantTimelineItems,
} from "../presentation/webAssistantChatTimeline";

describe("toWebAssistantTimelineItems", () => {
  it("keeps pending tool input visible for info popover", () => {
    const items = toWebAssistantTimelineItems([
      {
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "call_1",
            name: "assistant.view.describe",
            input: {
              view_id: "board.main",
            },
          },
        ],
      },
    ], {
      isRunning: true,
    });

    const toolItem = items.find((item) => item.kind === "part" && item.item.type === "tool");
    if (!toolItem || toolItem.kind !== "part") {
      throw new Error("missing tool item");
    }

    expect(toolItem.item.status).toBe("pending");
    expect(toolItem.item.toolDisplay).toEqual(expect.objectContaining({
      title: "Describe the active assistant view state.",
      hasInput: true,
      argsPreview: "",
      fullInputText: JSON.stringify({ view_id: "board.main" }, null, 2),
    }));
  });

  it("merges tool result back into the original tool item", () => {
    const items = toWebAssistantTimelineItems([
      {
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "call_1",
            name: "view.capability.invoke",
            input: {
              view_id: "board.main",
              capability_id: "board.add_edge",
              input: {
                source_node_id: "node-a",
                target_node_id: "node-b",
              },
            },
          },
        ],
      },
      {
        role: "tool",
        name: "view.capability.invoke",
        toolCallId: "call_1",
        content: {
          ok: true,
          display: {
            title: "Connect board nodes",
          },
          data: {
            status: "applied",
          },
        },
      },
    ], {
      isRunning: false,
    });

    const toolItems = items.filter((item) => item.kind === "part" && item.item.type === "tool");
    expect(toolItems).toHaveLength(1);

    const toolItem = toolItems[0];
    if (toolItem.kind !== "part") {
      throw new Error("invalid tool item");
    }

    expect(toolItem.item.status).toBe("completed");
    expect(toolItem.item.toolDisplay).toEqual(expect.objectContaining({
      title: "Connect board nodes",
      hasInput: true,
      hasError: false,
      argsPreview: "",
      fullInputText: expect.stringContaining('"capability_id": "board.add_edge"'),
      detailsText: expect.stringContaining('"status": "applied"'),
    }));
  });

  it("keeps info input and exposes full error details on failed tool calls", () => {
    const items = toWebAssistantTimelineItems([
      {
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "call_1",
            name: "view.capability.invoke",
            input: {
              view_id: "board.main",
              capability_id: "board.add_edge",
              input: {
                target_node_id: "missing-node",
              },
            },
          },
        ],
      },
      {
        role: "tool",
        name: "view.capability.invoke",
        toolCallId: "call_1",
        content: {
          ok: false,
          error_code: "board_node_not_found",
          message: "target node not found",
        },
      },
    ], {
      isRunning: false,
    });

    const toolItem = items.find((item) => item.kind === "part" && item.item.type === "tool");
    if (!toolItem || toolItem.kind !== "part") {
      throw new Error("missing tool item");
    }

    expect(toolItem.item.status).toBe("error");
    expect(toolItem.item.toolDisplay).toEqual(expect.objectContaining({
      hasInput: true,
      hasError: true,
      fullInputText: expect.stringContaining('"target_node_id": "missing-node"'),
      fullErrorText: expect.stringContaining('"error_code": "board_node_not_found"'),
    }));
  });
});

describe("getWebAssistantLabels", () => {
  it("provides explicit tool and error labels", () => {
    expect(getWebAssistantLabels()).toEqual(expect.objectContaining({
      errorLabel: "Error",
      errorDetailToggle: "View error details",
      toolInputAriaLabel: "View tool input",
      toolInputTitle: "Tool Input",
      toolNameLabel: "Tool",
    }));
  });
});
