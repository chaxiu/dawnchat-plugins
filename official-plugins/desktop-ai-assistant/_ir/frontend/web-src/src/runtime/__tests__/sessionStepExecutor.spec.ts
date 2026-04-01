import {
  createSessionStepCapabilityRegistration,
  createSessionStepCapabilityRegistrations,
  createSessionStepHandler,
  type SessionStepExecutorDeps,
} from "../sessionStepExecutor";
import { GUIDE_ACTIONS } from "../guideActions";
import { createViewDescribeCapabilityRegistration } from "../viewRuntime";

const createDeps = (): SessionStepExecutorDeps => ({
  setCurrentCard: vi.fn(() => 1),
  setActiveTip: vi.fn(),
  setNarrationState: vi.fn(),
  setActiveViewState: vi.fn(() => 1),
  navigateToView: vi.fn(),
  getViewStateSnapshot: vi.fn(() => ({
    active_view_id: "word.main",
    active_anchor: "word.header",
    current_resource: {
      resource_type: "word",
      resource_id: "word:assistant",
      title: "词汇讲解",
      data: {
        word: "Assistant",
        meaning: "你的自进化智能助理",
        etymology: ["支持富媒体呈现"],
      },
    },
    active_manifest: {
      view_id: "word.main",
      resource_type: "word",
      title: "Word Workspace",
      route_name: "view-word-main",
      route_path: "/views/word/main",
      anchors: [
        { id: "word.header", title: "Header", description: "单词标题与概览区域" },
        { id: "word.meaning", title: "Meaning", description: "单词释义与讲解重点区域" },
        { id: "word.etymology", title: "Etymology", description: "词源与扩展信息区域" },
      ],
      capabilities: [
        {
          id: "highlight_meaning",
          title: "Highlight Meaning",
          description: "将页面焦点切换到词义区域",
          input_schema: {
            type: "object",
            properties: {},
          },
          output_schema: {
            type: "object",
            properties: {
              status: { type: "string" },
              highlighted_anchor: { type: "string" },
            },
          },
          affected_anchors: ["word.meaning"],
          error_codes: [],
        },
        {
          id: "append_etymology",
          title: "Append Etymology",
          description: "向词源列表追加条目",
          input_schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
              },
            },
            required: ["items"],
          },
          output_schema: {
            type: "object",
            properties: {
              status: { type: "string" },
              appended_count: { type: "number" },
              appended_items: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
          affected_anchors: ["word.etymology"],
          error_codes: ["invalid_view_capability_input"],
        },
        {
          id: "set_title",
          title: "Set Title",
          description: "更新当前单词页面标题",
          input_schema: {
            type: "object",
            properties: {
              title: { type: "string", minLength: 1 },
            },
            required: ["title"],
          },
          output_schema: {
            type: "object",
            properties: {
              status: { type: "string" },
              title: { type: "string" },
            },
          },
          affected_anchors: ["word.header"],
          error_codes: ["invalid_view_capability_input"],
        },
      ],
      resource_contract: {
        resource_schema: {
          type: "object",
          properties: {
            resource_type: { type: "string", enum: ["word"] },
          },
        },
        open_payload_schema: {
          type: "object",
          properties: {
            view_id: { type: "string" },
          },
        },
        default_resource: {
          resource_type: "word",
          resource_id: "word:assistant",
          title: "词汇讲解",
          data: {
            word: "Assistant",
            meaning: "你的自进化智能助理",
            etymology: ["支持富媒体呈现"],
          },
        },
        error_codes: ["invalid_view_resource", "anchor_not_found"],
      },
      state_summary: {
        word: "Assistant",
        active_anchor: "word.header",
      },
    },
    view_state_version: 1,
  })),
  onActiveSessionsChanged: vi.fn(),
});
const sessionId = "sess-1";

const resolveAsyncStep = (
  resolveStep: ((value: Record<string, unknown>) => void) | null,
  value: Record<string, unknown>
) => {
  if (typeof resolveStep === "function") {
    resolveStep(value);
  }
};

describe("session step executor", () => {
  it("executes guide.card.show action and returns applied result", async () => {
    const deps = createDeps();
    const handler = createSessionStepHandler(deps);
    const result = await handler({
      session_id: sessionId,
      step_id: "step-1",
      action: {
        type: `guide.${GUIDE_ACTIONS.CARD_SHOW}`,
        payload: {
          card_type: "word",
          title: "词汇讲解",
          data: {
            word: "synchronize",
            meaning: "使同步",
          },
        },
      },
      timeout_ms: 45000,
    }, {});

    expect(deps.setCurrentCard).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      data: {
        status: "applied",
        card_type: "word",
        voice_applied: false,
        session_id: sessionId,
        step_id: "step-1",
        action_type: `guide.${GUIDE_ACTIONS.CARD_SHOW}`,
        timeout_ms: 45000,
      },
    });
  });

  it("returns invalid_step when action.type is missing", async () => {
    const handler = createSessionStepHandler(createDeps());
    const result = await handler({
      session_id: sessionId,
      step_id: "step-1",
      action: {
        payload: {},
      },
    }, {});
    expect(result).toEqual({
      ok: false,
      error_code: "invalid_step",
      message: "Missing action.type in step payload",
    });
  });

  it("returns invalid_step when session_id is missing", async () => {
    const handler = createSessionStepHandler(createDeps());
    const result = await handler({
      step_id: "step-1",
      action: {
        type: `guide.${GUIDE_ACTIONS.CARD_SHOW}`,
        payload: {},
      },
    }, {});
    expect(result).toEqual({
      ok: false,
      error_code: "invalid_step",
      message: "Missing session_id in step payload",
    });
  });

  it("returns unsupported_namespace when namespace is not registered", async () => {
    const handler = createSessionStepHandler(createDeps());
    const result = await handler({
      session_id: sessionId,
      action: {
        type: "route.goto",
        payload: {
          path: "/playground",
        },
      },
    }, {});
    expect(result).toEqual({
      ok: false,
      error_code: "unsupported_namespace",
      message: "Unsupported action namespace: route",
    });
  });

  it("returns unsupported_action when namespace exists but action is not implemented", async () => {
    const handler = createSessionStepHandler(createDeps());
    const result = await handler({
      session_id: sessionId,
      action: {
        type: "view.close",
        payload: {
          view_id: "word.main",
        },
      },
    }, {});
    expect(result).toEqual({
      ok: false,
      error_code: "unsupported_action",
      message: "Unsupported action.type: view.close",
    });
  });

  it("opens a registered view and writes view state", async () => {
    const deps = createDeps();
    const handler = createSessionStepHandler(deps);
    const result = await handler({
      session_id: sessionId,
      step_id: "step-view-open",
      action: {
        type: "view.open",
        payload: {
          view_id: "word.main",
          resource: {
            resource_type: "word",
            resource_id: "word:synchronize",
            title: "词汇工作区",
            data: {
              word: "synchronize",
              meaning: "使同步",
              etymology: ["syn", "chron"],
            },
          },
          initial_anchor: "word.meaning",
        },
      },
    }, {});
    expect(deps.setActiveViewState).toHaveBeenCalledWith(
      expect.objectContaining({
        viewId: "word.main",
        activeAnchor: "word.meaning",
        resource: expect.objectContaining({
          resource_type: "word",
          resource_id: "word:synchronize",
        }),
      })
    );
    expect(deps.navigateToView).toHaveBeenCalledWith("word.main");
    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "applied",
        view_id: "word.main",
        active_anchor: "word.meaning",
        route_path: "/views/word/main",
        resource_type: "word",
        session_id: sessionId,
        step_id: "step-view-open",
        action_type: "view.open",
      }),
    });
  });

  it("returns invalid_view_resource when word resource is malformed", async () => {
    const handler = createSessionStepHandler(createDeps());
    const result = await handler({
      session_id: sessionId,
      action: {
        type: "view.open",
        payload: {
          view_id: "word.main",
          resource: {
            resource_type: "word",
            data: {
              meaning: "缺少单词",
            },
          },
        },
      },
    }, {});
    expect(result).toEqual({
      ok: false,
      error_code: "invalid_view_resource",
      message: "word.main requires resource.data.word to be a non-empty string",
    });
  });

  it("focuses an active anchor inside the current view", async () => {
    const deps = createDeps();
    const handler = createSessionStepHandler(deps);
    const result = await handler({
      session_id: sessionId,
      step_id: "step-view-focus",
      action: {
        type: "view.focus",
        payload: {
          view_id: "word.main",
          anchor: "word.etymology",
        },
      },
    }, {});
    expect(deps.getViewStateSnapshot).toHaveBeenCalled();
    expect(deps.setActiveViewState).toHaveBeenCalledWith(
      expect.objectContaining({
        viewId: "word.main",
        activeAnchor: "word.etymology",
      })
    );
    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "applied",
        view_id: "word.main",
        active_anchor: "word.etymology",
        session_id: sessionId,
        step_id: "step-view-focus",
        action_type: "view.focus",
      }),
    });
  });

  it("focuses active view when payload.view_id is omitted and anchor_id is provided", async () => {
    const deps = createDeps();
    const handler = createSessionStepHandler(deps);
    const result = await handler({
      session_id: sessionId,
      step_id: "step-view-focus-anchor-id",
      action: {
        type: "view.focus",
        payload: {
          anchor_id: "word.meaning",
        },
      },
    }, {});
    expect(deps.setActiveViewState).toHaveBeenCalledWith(
      expect.objectContaining({
        viewId: "word.main",
        activeAnchor: "word.meaning",
      })
    );
    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "applied",
        view_id: "word.main",
        active_anchor: "word.meaning",
        session_id: sessionId,
        step_id: "step-view-focus-anchor-id",
        action_type: "view.focus",
      }),
    });
  });

  it("invokes a registered view capability and updates view state", async () => {
    const deps = createDeps();
    const handler = createSessionStepHandler(deps);
    const result = await handler({
      session_id: sessionId,
      step_id: "step-view-capability",
      action: {
        type: "view.capability.invoke",
        payload: {
          view_id: "word.main",
          capability: "append_etymology",
          input: {
            items: ["ize"],
          },
        },
      },
    }, {});
    expect(deps.setActiveViewState).toHaveBeenCalledWith(
      expect.objectContaining({
        viewId: "word.main",
        activeAnchor: "word.etymology",
        resource: expect.objectContaining({
          data: expect.objectContaining({
            etymology: ["支持富媒体呈现", "ize"],
          }),
        }),
      })
    );
    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        status: "applied",
        view_id: "word.main",
        capability: "append_etymology",
        active_anchor: "word.etymology",
        appended_count: 1,
        appended_items: ["ize"],
        session_id: sessionId,
        step_id: "step-view-capability",
        action_type: "view.capability.invoke",
      }),
    });
  });

  it("returns invalid_view_capability_input when append_etymology items are empty", async () => {
    const handler = createSessionStepHandler(createDeps());
    const result = await handler({
      session_id: sessionId,
      action: {
        type: "view.capability.invoke",
        payload: {
          view_id: "word.main",
          capability: "append_etymology",
          input: {
            items: [],
          },
        },
      },
    }, {});
    expect(result).toEqual({
      ok: false,
      error_code: "invalid_view_capability_input",
      message: "append_etymology requires input.items to be a non-empty string array",
    });
  });

  it("returns invalid_view_capability_input when set_title title is empty", async () => {
    const handler = createSessionStepHandler(createDeps());
    const result = await handler({
      session_id: sessionId,
      action: {
        type: "view.capability.invoke",
        payload: {
          view_id: "word.main",
          capability: "set_title",
          input: {
            title: "   ",
          },
        },
      },
    }, {});
    expect(result).toEqual({
      ok: false,
      error_code: "invalid_view_capability_input",
      message: "set_title requires input.title to be a non-empty string",
    });
  });

  it("returns anchor_not_found when focusing an unknown anchor", async () => {
    const handler = createSessionStepHandler(createDeps());
    const result = await handler({
      session_id: sessionId,
      action: {
        type: "view.focus",
        payload: {
          view_id: "word.main",
          anchor: "word.unknown",
        },
      },
    }, {});
    expect(result).toEqual({
      ok: false,
      error_code: "anchor_not_found",
      message: "Anchor not found: word.unknown",
    });
  });

  it("returns view_capability_not_found when capability is not declared", async () => {
    const handler = createSessionStepHandler(createDeps());
    const result = await handler({
      session_id: sessionId,
      action: {
        type: "view.capability.invoke",
        payload: {
          view_id: "word.main",
          capability: "missing_capability",
        },
      },
    }, {});
    expect(result).toEqual({
      ok: false,
      error_code: "view_capability_not_found",
      message: "View capability not found: missing_capability",
    });
  });

  it("writes tip state and completes guide.tip.show without touching the main card", async () => {
    const deps = createDeps();
    const handler = createSessionStepHandler(deps);
    const result = await handler({
      session_id: sessionId,
      step_id: "step-2",
      action: {
        type: `guide.${GUIDE_ACTIONS.TIP_SHOW}`,
        payload: {
          title: "提示",
          message: "下一步将开始讲解",
          level: "info",
        },
      },
    }, {});
    expect(deps.setCurrentCard).not.toHaveBeenCalled();
    expect(deps.setActiveTip).toHaveBeenCalledWith({
      title: "提示",
      message: "下一步将开始讲解",
      level: "info",
    });
    expect(result).toEqual({
      ok: true,
      data: {
        status: "applied",
        tip_message: "下一步将开始讲解",
        tip_level: "info",
        session_id: sessionId,
        step_id: "step-2",
        action_type: `guide.${GUIDE_ACTIONS.TIP_SHOW}`,
        timeout_ms: undefined,
      },
    });
  });

  it("calls host voice bridge and completes guide.narrate after voice playback", async () => {
    const speak = vi.fn(async () => ({ ok: true, data: { status: "completed" } }));
    (window as any).__DAWNCHAT_HOST_VOICE__ = {
      speak,
    };
    const deps = createDeps();
    const handler = createSessionStepHandler(deps);
    const result = await handler({
      session_id: sessionId,
      step_id: "step-3",
      action: {
        type: `guide.${GUIDE_ACTIONS.NARRATE}`,
        payload: {
          text: "hello world",
          interrupt: true,
        },
      },
    }, {});
    expect(speak).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "hello world",
      })
    );
    expect(deps.setNarrationState).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        status: "playing",
        text: "hello world",
      })
    );
    expect(deps.setNarrationState).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: "completed",
        text: "hello world",
      })
    );
    expect(result).toEqual({
      ok: true,
      data: {
        status: "completed",
        narration_text: "hello world",
        voice_applied: true,
        session_id: sessionId,
        step_id: "step-3",
        action_type: `guide.${GUIDE_ACTIONS.NARRATE}`,
        timeout_ms: undefined,
      },
    });
    delete (window as any).__DAWNCHAT_HOST_VOICE__;
  });

  it("fails guide.narrate when payload.text is missing", async () => {
    const deps = createDeps();
    const handler = createSessionStepHandler(deps);
    const result = await handler({
      session_id: sessionId,
      action: {
        type: `guide.${GUIDE_ACTIONS.NARRATE}`,
        payload: {},
      },
    }, {});
    expect(result).toEqual({
      ok: false,
      error_code: "invalid_guide_payload",
      message: "guide.narrate requires payload.text",
    });
    expect(deps.setNarrationState).not.toHaveBeenCalled();
  });

  it("fails guide.narrate when host voice bridge returns an error", async () => {
    const speak = vi.fn(async () => ({
      ok: false,
      error_code: "tts_failed",
      message: "tts failed",
    }));
    (window as any).__DAWNCHAT_HOST_VOICE__ = {
      speak,
    };
    const deps = createDeps();
    const handler = createSessionStepHandler(deps);
    const result = await handler({
      session_id: sessionId,
      action: {
        type: `guide.${GUIDE_ACTIONS.NARRATE}`,
        payload: {
          text: "hello world",
        },
      },
    }, {});
    expect(result).toEqual({
      ok: false,
      error_code: "tts_failed",
      message: "tts failed",
    });
    expect(deps.setNarrationState).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: "failed",
        text: "hello world",
        errorMessage: "tts failed",
      })
    );
    delete (window as any).__DAWNCHAT_HOST_VOICE__;
  });

  it("fails guide.tip.show when payload.message is missing", async () => {
    const deps = createDeps();
    const handler = createSessionStepHandler(deps);
    const result = await handler({
      session_id: sessionId,
      action: {
        type: `guide.${GUIDE_ACTIONS.TIP_SHOW}`,
        payload: {},
      },
    }, {});
    expect(result).toEqual({
      ok: false,
      error_code: "invalid_guide_payload",
      message: "guide.tip.show requires payload.message",
    });
    expect(deps.setActiveTip).not.toHaveBeenCalled();
  });

  it("cancels active guide.narrate and calls host voice stop", async () => {
    let resolveSpeak: ((value: Record<string, unknown>) => void) | null = null;
    const speak = vi.fn(
      async () =>
        await new Promise<Record<string, unknown>>((resolve) => {
          resolveSpeak = resolve;
        })
    );
    const stop = vi.fn(async () => ({
      ok: true,
      data: {
        stopped: true,
      },
    }));
    const status = vi.fn(async () => ({
      ok: true,
      data: {
        status: "cancelled",
        task_id: "task-1",
      },
    }));
    (window as any).__DAWNCHAT_HOST_VOICE__ = {
      speak,
      stop,
      status,
    };
    const deps = createDeps();
    const registrations = createSessionStepCapabilityRegistrations(deps);
    const execute = registrations.find((item) => item.definition.name === "assistant.session_step_execute")?.handler;
    const cancel = registrations.find((item) => item.definition.name === "assistant.session_step_cancel")?.handler;
    expect(execute).toBeTypeOf("function");
    expect(cancel).toBeTypeOf("function");

    const executePromise = execute?.({
      session_id: sessionId,
      step_id: "step-4",
      action: {
        type: `guide.${GUIDE_ACTIONS.NARRATE}`,
        payload: {
          text: "cancel me",
        },
      },
    }, {}) as Promise<Record<string, unknown>>;

    await Promise.resolve();

    const cancelResult = await cancel?.({
      session_id: sessionId,
      step_id: "step-4",
      reason: "agent_interrupted",
    }, {});

    expect(cancelResult).toEqual({
      ok: true,
      data: {
        session_id: sessionId,
        step_id: "step-4",
        active_step_found: true,
        cancel_requested: true,
        reason: "agent_interrupted",
      },
    });
    expect(stop).toHaveBeenCalledTimes(1);

    resolveAsyncStep(resolveSpeak, {
      ok: false,
      error_code: "voice_task_not_completed",
      message: "voice task terminal status: cancelled",
      data: {
        task_id: "task-1",
        status: "cancelled",
      },
    });

    await expect(executePromise).resolves.toEqual({
      ok: false,
      error_code: "step_cancelled",
      message: "guide narration cancelled",
      data: {
        status: "cancelled",
        narration_text: "cancel me",
        task_id: "task-1",
      },
    });
    expect(status).toHaveBeenCalledWith({
      task_id: "task-1",
    });
    expect(deps.setNarrationState).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: "cancelling",
        text: "cancel me",
      })
    );
    expect(deps.setNarrationState).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        status: "cancelled",
        text: "cancel me",
      })
    );
    delete (window as any).__DAWNCHAT_HOST_VOICE__;
  });

  it("builds session step capability definition", () => {
    const registration = createSessionStepCapabilityRegistration(createDeps());
    expect(registration.definition.name).toBe("assistant.session_step_execute");
    expect(registration.definition.input_schema).toBeTruthy();
    expect((registration.definition.input_schema.required as string[]) || []).toContain("session_id");
  });

  it("builds session step cancel capability definition", () => {
    const registrations = createSessionStepCapabilityRegistrations(createDeps());
    const cancelRegistration = registrations.find((item) => item.definition.name === "assistant.session_step_cancel");
    expect(cancelRegistration).toBeTruthy();
    expect(cancelRegistration?.definition.input_schema).toBeTruthy();
  });

  it("syncs active session ids for visual state", async () => {
    const deps = createDeps();
    let resolveSpeak: ((value: Record<string, unknown>) => void) | null = null;
    (window as any).__DAWNCHAT_HOST_VOICE__ = {
      speak: vi.fn(
        async () =>
          await new Promise<Record<string, unknown>>((resolve) => {
            resolveSpeak = resolve;
          }),
      ),
      stop: vi.fn(async () => ({ ok: true })),
      status: vi.fn(async () => ({ ok: true, data: { status: "completed" } })),
    };
    const handler = createSessionStepHandler(deps);
    const executePromise = handler(
      {
        session_id: sessionId,
        step_id: "step-visual-state",
        action: {
          type: `guide.${GUIDE_ACTIONS.NARRATE}`,
          payload: {
            text: "state sync",
          },
        },
      },
      {},
    );
    await Promise.resolve();
    expect(deps.onActiveSessionsChanged).toHaveBeenCalledWith([sessionId]);

    resolveAsyncStep(resolveSpeak, { ok: true, data: { status: "completed" } });
    await executePromise;

    expect(deps.onActiveSessionsChanged).toHaveBeenLastCalledWith([]);
    delete (window as any).__DAWNCHAT_HOST_VOICE__;
  });

  it("builds assistant.view.describe capability and returns active snapshot", async () => {
    const deps = {
      ...createDeps(),
      getGuideStateSnapshot: vi.fn(() => ({
        current_card: {
          card_type: "word" as const,
          title: "Guide Card",
          data: {
            word: "Assistant",
          },
        },
        active_tip: {
          message: "当前正在查看词义区域",
          level: "info",
        },
        narration_state: {
          status: "completed" as const,
          text: "guide ready",
          updatedAtMs: 100,
        },
        guide_state_version: 1,
      })),
    };
    const registration = createViewDescribeCapabilityRegistration(deps);
    expect(registration.definition.name).toBe("assistant.view.describe");
    const result = await registration.handler({
      view_id: "word.main",
    }, {});
    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        active_view_id: "word.main",
        active_route_path: "/views/word/main",
        active_anchor: "word.header",
        current_resource_summary: expect.objectContaining({
          word: "Assistant",
        }),
        guide_state: expect.objectContaining({
          current_card: expect.objectContaining({
            card_type: "word",
          }),
          narration_state: expect.objectContaining({
            status: "completed",
          }),
        }),
        available_views: expect.arrayContaining([
          expect.objectContaining({
            view_id: "word.main",
            route_path: "/views/word/main",
            resource_contract: expect.objectContaining({
              resource_schema: expect.any(Object),
            }),
            capabilities: expect.arrayContaining([
              expect.objectContaining({
                id: "append_etymology",
                input_schema: expect.any(Object),
                affected_anchors: ["word.etymology"],
              }),
            ]),
          }),
        ]),
        requested_view: expect.objectContaining({
          view_id: "word.main",
          route_path: "/views/word/main",
        }),
      }),
    });
  });
});
