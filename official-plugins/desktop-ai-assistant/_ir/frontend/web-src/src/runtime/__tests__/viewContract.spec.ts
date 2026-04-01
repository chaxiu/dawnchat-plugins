import { invokeWordMainCapability, buildWordMainStateSummary } from "../../views/pages/word/wordMain.capabilities";
import { createWordMainManifest, WORD_DEFAULT_RESOURCE } from "../../views/pages/word/wordMain.contract";
import { openWordMainView, validateWordResource } from "../../views/pages/word/wordMain.resource";

describe("word.main contract", () => {
  it("exposes manifest contract for word.main", () => {
    const manifest = createWordMainManifest();
    expect(manifest.view_id).toBe("word.main");
    expect(manifest.resource_contract.resource_schema).toEqual(expect.any(Object));
    expect(manifest.resource_contract.open_payload_schema).toEqual(expect.any(Object));
    expect(manifest.capabilities.map((item) => item.id)).toEqual([
      "highlight_meaning",
      "append_etymology",
      "set_title",
    ]);
  });

  it("opens word.main with normalized resource payload", () => {
    const result = openWordMainView({
      resource: {
        resource_type: "word",
        data: {
          word: "Evolution",
          meaning: "逐步演化",
          etymology: ["e- + volvere"],
        },
      },
    });

    expect(result).toEqual({
      resource: {
        resource_type: "word",
        resource_id: "word:evolution",
        title: "Evolution Workspace",
        data: {
          word: "Evolution",
          meaning: "逐步演化",
          etymology: ["e- + volvere"],
        },
      },
      activeAnchor: "word.header",
      data: {
        status: "applied",
        resource_id: "word:evolution",
      },
    });
  });

  it("rejects invalid word resource payload", () => {
    const result = validateWordResource({
      resource_type: "word",
      data: {
        word: "",
      },
    });

    expect(result).toEqual({
      ok: false,
      error_code: "invalid_view_resource",
      message: "word.main requires resource.data.word to be a non-empty string",
      data: undefined,
    });
  });

  it("appends etymology entries and updates active anchor", () => {
    const result = invokeWordMainCapability("append_etymology", {
      items: ["来自拉丁语演化"],
    }, WORD_DEFAULT_RESOURCE);

    expect(result).toEqual({
      resource: {
        resource_type: "word",
        resource_id: "word:assistant",
        title: "词汇讲解",
        data: {
          word: "Assistant",
          meaning: "你的自进化智能助理",
          etymology: ["支持富媒体呈现", "支持代码级进化", "来自拉丁语演化"],
        },
      },
      activeAnchor: "word.etymology",
      data: {
        status: "applied",
        appended_count: 1,
        appended_items: ["来自拉丁语演化"],
      },
    });
  });

  it("returns capability input error for empty title", () => {
    const result = invokeWordMainCapability("set_title", {
      title: "   ",
    }, WORD_DEFAULT_RESOURCE);

    expect(result).toEqual({
      ok: false,
      error_code: "invalid_view_capability_input",
      message: "set_title requires input.title to be a non-empty string",
      data: undefined,
    });
  });

  it("builds state summary from current resource", () => {
    const summary = buildWordMainStateSummary({
      resource_type: "word",
      resource_id: "word:checkpoint",
      title: "Checkpoint Workspace",
      data: {
        word: "Checkpoint",
        meaning: "恢复点",
        etymology: ["check + point"],
      },
    }, "word.meaning");

    expect(summary).toEqual({
      resource_title: "Checkpoint Workspace",
      word: "Checkpoint",
      has_meaning: true,
      etymology_count: 1,
      active_anchor: "word.meaning",
    });
  });
});
