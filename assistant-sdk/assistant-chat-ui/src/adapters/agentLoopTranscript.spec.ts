import { describe, expect, it } from "vitest";

import {
  agentLoopTranscriptToTimelineItems,
  projectAgentLoopTranscript,
  type AgentLoopLikeMessage,
} from "./agentLoopTranscript";

describe("agentLoopTranscriptToTimelineItems", () => {
  it("maps user, assistant, and pending tool call messages", () => {
    const transcript: AgentLoopLikeMessage[] = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "working on it" },
      {
        role: "assistant",
        content: { status: "tool_calls_requested" },
        toolCalls: [
          {
            id: "call-1",
            name: "view.capability.invoke",
            input: { shape: "circle" },
          },
        ],
      },
    ];

    const items = agentLoopTranscriptToTimelineItems(transcript, {
      isRunning: true,
      getToolDescription: () => "Invoke view capability",
    });

    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      kind: "part",
      role: "user",
      item: { type: "text", text: "hello", isStreaming: false },
    });
    expect(items[1]).toMatchObject({
      kind: "part",
      role: "assistant",
      item: { type: "text", text: "working on it", isStreaming: false },
    });
    expect(items[2]).toMatchObject({
      kind: "part",
      role: "assistant",
      item: {
        type: "tool",
        status: "pending",
        isStreaming: true,
        toolDisplay: {
          title: "Invoke view capability",
          argsText: "",
          argsPreview: "",
          hasInput: true,
        },
      },
    });
    expect(items[2]?.kind === "part" && items[2].item.toolDisplay?.fullInputText).toContain('"shape": "circle"');
  });

  it("merges tool result into pending tool item by toolCallId", () => {
    const transcript: AgentLoopLikeMessage[] = [
      {
        role: "assistant",
        content: { status: "tool_calls_requested" },
        toolCalls: [
          {
            id: "call-1",
            name: "dawnchat.ui.capability.invoke",
            input: { action: "draw-circle" },
          },
        ],
      },
      {
        role: "tool",
        name: "dawnchat.ui.capability.invoke",
        toolCallId: "call-1",
        content: {
          ok: true,
          display: { title: "Circle Drawn" },
          data: { id: "shape-1" },
        },
      },
    ];

    const items = agentLoopTranscriptToTimelineItems(transcript, {
      isRunning: false,
      getToolDescription: () => "Invoke capability",
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "part",
      role: "assistant",
      item: {
        type: "tool",
        status: "completed",
        isStreaming: false,
        toolDisplay: {
          title: "Circle Drawn",
          hasOutput: true,
          hasError: false,
        },
      },
    });
    expect(items[0]?.kind === "part" && items[0].item.toolDisplay?.fullInputText).toContain("draw-circle");
    expect(items[0]?.kind === "part" && items[0].item.toolDisplay?.fullOutputText).toContain("shape-1");
  });

  it("keeps full error details and preserves input for failed tools", () => {
    const transcript: AgentLoopLikeMessage[] = [
      {
        role: "assistant",
        content: { status: "tool_calls_requested" },
        toolCalls: [
          {
            id: "call-err",
            name: "assistant.session.start",
            input: { session: "abc" },
          },
        ],
      },
      {
        role: "tool",
        name: "assistant.session.start",
        toolCallId: "call-err",
        content: {
          ok: false,
          error: {
            code: "session_failed",
            message: "Session start failed",
          },
        },
      },
    ];

    const items = agentLoopTranscriptToTimelineItems(transcript, {
      isRunning: false,
      getToolDescription: () => "Start session",
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "part",
      role: "assistant",
      item: {
        type: "tool",
        status: "error",
        toolDisplay: {
          title: "Start session",
          hasError: true,
          hasInput: true,
        },
      },
    });
    expect(items[0]?.kind === "part" && items[0].item.toolDisplay?.fullInputText).toContain('"session": "abc"');
    expect(items[0]?.kind === "part" && items[0].item.toolDisplay?.fullErrorText).toContain("Session start failed");
  });

  it("falls back to tool name when description is unavailable", () => {
    const transcript: AgentLoopLikeMessage[] = [
      {
        role: "tool",
        name: "assistant.unknown",
        content: { ok: true, result: "done" },
      },
    ];

    const items = agentLoopTranscriptToTimelineItems(transcript, {
      isRunning: false,
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "part",
      role: "assistant",
      item: {
        type: "tool",
        toolDisplay: {
          title: "assistant.unknown",
        },
      },
    });
  });

  it("keeps only live-turn reasoning streaming until text/tool appears", () => {
    const transcript: AgentLoopLikeMessage[] = [
      {
        role: "assistant",
        content: "",
        parts: [
          {
            id: "reasoning-hist",
            type: "reasoning",
            text: "历史推理",
          },
          {
            id: "text-hist",
            type: "text",
            text: "历史正文",
          },
        ],
      },
      {
        role: "user",
        content: "继续",
      },
      {
        role: "assistant",
        content: "",
        parts: [
          {
            id: "reasoning-1",
            type: "reasoning",
            text: "先判断当前页面是否可控",
          },
          {
            id: "text-1",
            type: "text",
            text: "我先检查当前页面状态。",
          },
          {
            id: "tool-1",
            type: "tool",
            tool: "host.get_current_page",
            callID: "call-1",
            state: {
              status: "running",
              input: {},
            },
          },
        ],
      },
      {
        role: "tool",
        content: "",
        parts: [
          {
            id: "tool-result-1",
            type: "tool",
            tool: "host.get_current_page",
            callID: "call-1",
            state: {
              status: "completed",
              output: {
                page_id: "host.apps_home",
              },
            },
          },
        ],
      },
    ];

    const projection = projectAgentLoopTranscript(transcript, {
      isRunning: true,
    });

    expect(projection.activeReasoningItemId).toBe("");
    expect(projection.timelineItems[0]).toMatchObject({
      item: {
        id: "reasoning-hist",
        type: "reasoning",
        isStreaming: false,
      },
    });
    expect(projection.timelineItems[3]).toMatchObject({
      item: {
        id: "reasoning-1",
        type: "reasoning",
        isStreaming: false,
      },
    });
    expect(projection.timelineItems[4]).toMatchObject({
      item: {
        id: "text-1",
        type: "text",
        isStreaming: true,
      },
    });
    expect(projection.timelineItems[5]).toMatchObject({
      item: {
        id: "tool-1",
        type: "tool",
        status: "completed",
        isStreaming: false,
      },
    });
  });

  it("marks live reasoning streaming before text starts", () => {
    const transcript: AgentLoopLikeMessage[] = [
      {
        role: "assistant",
        content: "",
        parts: [
          {
            id: "reasoning-live",
            type: "reasoning",
            text: "思考中",
          },
        ],
      },
    ];

    const projection = projectAgentLoopTranscript(transcript, {
      isRunning: true,
    });

    expect(projection.activeReasoningItemId).toBe("reasoning-live");
    expect(projection.timelineItems[0]).toMatchObject({
      item: {
        id: "reasoning-live",
        type: "reasoning",
        isStreaming: true,
      },
    });
  });

  it("does not stream historical reasoning while a newer turn is running", () => {
    const transcript: AgentLoopLikeMessage[] = [
      {
        role: "assistant",
        content: "",
        parts: [
          {
            id: "reasoning-old",
            type: "reasoning",
            text: "旧推理",
          },
          {
            id: "text-old",
            type: "text",
            text: "旧正文",
          },
        ],
      },
      {
        role: "user",
        content: "下一轮",
      },
    ];

    const projection = projectAgentLoopTranscript(transcript, {
      isRunning: true,
    });

    expect(projection.activeReasoningItemId).toBe("");
    expect(projection.timelineItems[0]).toMatchObject({
      item: {
        id: "reasoning-old",
        isStreaming: false,
      },
    });
  });
});
