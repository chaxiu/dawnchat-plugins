import { describe, expect, it } from "vitest";

import { agentLoopTranscriptToTimelineItems, type AgentLoopLikeMessage } from "./agentLoopTranscript";

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
});
