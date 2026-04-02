import type { ViewRegistration } from "../view";
import { createManifestSnapshot } from "../view/runtime.shared";
import { ARTICLE_DEFAULT_RESOURCE } from "../../views/pages/article/articleMain.contract";
import { articleMainViewRegistration } from "../../views/pages/article/articleMainViewRegistration";
import { WORD_DEFAULT_RESOURCE } from "../../views/pages/word/wordMain.contract";
import { wordMainViewRegistration } from "../../views/pages/word/wordMainViewRegistration";

describe("state summary validation", () => {
  it("accepts valid state summary for reference scenes", () => {
    const wordSnapshot = createManifestSnapshot(
      wordMainViewRegistration,
      WORD_DEFAULT_RESOURCE,
      "word.header"
    );
    const articleSnapshot = createManifestSnapshot(
      articleMainViewRegistration,
      ARTICLE_DEFAULT_RESOURCE,
      "article.summary"
    );

    expect(wordSnapshot.state_summary).toEqual(expect.objectContaining({
      word: "Assistant",
      active_anchor: "word.header",
    }));
    expect(articleSnapshot.state_summary).toEqual(expect.objectContaining({
      has_summary: true,
      active_anchor: "article.summary",
    }));
  });

  it("throws when state summary misses a required field", () => {
    const invalidRegistration: ViewRegistration = {
      manifest: {
        view_id: "broken.required",
        resource_type: "broken",
        title: "Broken Required",
        route_name: "broken-required",
        route_path: "/views/broken/required",
        state_mode: "stateful",
        anchors: [],
        capabilities: [],
        resource_contract: {
          resource_schema: { type: "object" },
          open_payload_schema: { type: "object" },
          default_resource: {
            resource_type: "broken",
            resource_id: "broken:1",
            data: {},
          },
        },
        state_summary_schema: {
          type: "object",
          properties: {
            required_text: { type: "string" },
          },
          required: ["required_text"],
        },
      },
      route: {
        path: "broken/required",
        name: "broken-required",
        component: {} as never,
      },
      createDefaultResource: () => ({
        resource_type: "broken",
        resource_id: "broken:1",
        data: {},
      }),
      buildStateSummary: () => ({}),
    };

    expect(() => createManifestSnapshot(invalidRegistration, invalidRegistration.createDefaultResource())).toThrow(
      "Invalid state summary for broken.required: missing required field: required_text"
    );
  });

  it("throws when state summary field type does not match schema", () => {
    const invalidRegistration: ViewRegistration = {
      manifest: {
        view_id: "broken.type",
        resource_type: "broken",
        title: "Broken Type",
        route_name: "broken-type",
        route_path: "/views/broken/type",
        state_mode: "stateful",
        anchors: [],
        capabilities: [],
        resource_contract: {
          resource_schema: { type: "object" },
          open_payload_schema: { type: "object" },
          default_resource: {
            resource_type: "broken",
            resource_id: "broken:2",
            data: {},
          },
        },
        state_summary_schema: {
          type: "object",
          properties: {
            count: { type: "number" },
          },
          required: ["count"],
        },
      },
      route: {
        path: "broken/type",
        name: "broken-type",
        component: {} as never,
      },
      createDefaultResource: () => ({
        resource_type: "broken",
        resource_id: "broken:2",
        data: {},
      }),
      buildStateSummary: () => ({
        count: "not-a-number",
      }),
    };

    expect(() => createManifestSnapshot(invalidRegistration, invalidRegistration.createDefaultResource())).toThrow(
      "Invalid state summary for broken.type: invalid field type for count: expected number"
    );
  });
});
