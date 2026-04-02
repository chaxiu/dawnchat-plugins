import {
  ARTICLE_DEFAULT_RESOURCE,
  createArticleMainManifest,
} from "../../views/pages/article/articleMain.contract";
import {
  buildArticleMainStateSummary,
  invokeArticleMainCapability,
} from "../../views/pages/article/articleMain.capabilities";
import {
  openArticleMainView,
  validateArticleResource,
} from "../../views/pages/article/articleMain.resource";
import { invokeWordMainCapability, buildWordMainStateSummary } from "../../views/pages/word/wordMain.capabilities";
import { createWordMainManifest, WORD_DEFAULT_RESOURCE } from "../../views/pages/word/wordMain.contract";
import { openWordMainView, validateWordResource } from "../../views/pages/word/wordMain.resource";

describe("scene contracts", () => {
  it("exposes manifest contract for word.main", () => {
    const manifest = createWordMainManifest();
    expect(manifest.view_id).toBe("word.main");
    expect(manifest.state_mode).toBe("lightweight");
    expect(manifest.resource_contract.resource_schema).toEqual(expect.any(Object));
    expect(manifest.resource_contract.open_payload_schema).toEqual(expect.any(Object));
    expect(manifest.state_summary_schema).toEqual(expect.any(Object));
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
      resource_id: "word:reference",
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

  it("exposes manifest contract for article.main", () => {
    const manifest = createArticleMainManifest();
    expect(manifest.view_id).toBe("article.main");
    expect(manifest.state_mode).toBe("lightweight");
    expect(manifest.resource_contract.resource_schema).toEqual(expect.any(Object));
    expect(manifest.resource_contract.open_payload_schema).toEqual(expect.any(Object));
    expect(manifest.state_summary_schema).toEqual(expect.any(Object));
    expect(manifest.capabilities.map((item) => item.id)).toEqual([
      "highlight_summary",
      "append_annotation",
      "set_title",
    ]);
  });

  it("opens article.main with normalized resource payload", () => {
    const result = openArticleMainView({
      resource: {
        resource_type: "article",
        title: "Runtime Boundary Notes",
        data: {
          summary: "验证第二场景只做架构验收。",
          sections: ["冻结模板", "验证第二场景"],
          annotations: ["不要滑向产品化"],
          tags: ["phase9"],
        },
      },
    });

    expect(result).toEqual({
      resource: {
        resource_type: "article",
        resource_id: "article:runtime-boundary-notes",
        title: "Runtime Boundary Notes",
        data: {
          summary: "验证第二场景只做架构验收。",
          sections: ["冻结模板", "验证第二场景"],
          annotations: ["不要滑向产品化"],
          tags: ["phase9"],
        },
      },
      activeAnchor: "article.header",
      data: {
        status: "applied",
        resource_id: "article:runtime-boundary-notes",
      },
    });
  });

  it("rejects invalid article resource payload", () => {
    const result = validateArticleResource({
      resource_type: "article",
      title: "",
      data: {
        summary: "",
      },
    });

    expect(result).toEqual({
      ok: false,
      error_code: "invalid_view_resource",
      message: "article.main requires resource.title to be a non-empty string",
      data: undefined,
    });
  });

  it("appends article annotations and updates active anchor", () => {
    const result = invokeArticleMainCapability("append_annotation", {
      items: ["验证 resource slice 兼容性"],
    }, ARTICLE_DEFAULT_RESOURCE);

    expect(result).toEqual({
      resource: {
        resource_type: "article",
        resource_id: "article:assistant-runtime",
        title: "AI Runtime Notes",
        data: {
          summary: "用最小阅读场景验证 AI workspace 模板是否可扩展。",
          sections: [
            "Phase 9 先硬化模板 contract，再验证第二场景接入。",
            "目标不是做文章产品，而是验证 runtime 核心无需改写。",
          ],
          annotations: [
            "Keep scene minimal",
            "Validate workspace slice reuse",
            "验证 resource slice 兼容性",
          ],
          tags: ["architecture", "validation"],
        },
      },
      activeAnchor: "article.annotations",
      data: {
        status: "applied",
        appended_count: 1,
        appended_items: ["验证 resource slice 兼容性"],
      },
    });
  });

  it("builds article state summary from current resource", () => {
    const summary = buildArticleMainStateSummary({
      resource_type: "article",
      resource_id: "article:phase9",
      title: "Phase 9 Validation",
      data: {
        summary: "以最小第二场景验证 runtime 可扩展性。",
        sections: ["Contract", "Workspace", "Validation"],
        annotations: ["Do not rebuild runtime"],
      },
    }, "article.summary");

    expect(summary).toEqual({
      resource_title: "Phase 9 Validation",
      has_summary: true,
      section_count: 3,
      annotation_count: 1,
      active_anchor: "article.summary",
    });
  });
});
