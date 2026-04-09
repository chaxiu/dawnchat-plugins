import {
  imageExplainerMainView,
  IMAGE_EXPLAINER_DEFAULT_RESOURCE,
  normalizeImageExplainerResource,
} from "../imageExplainerMain.view";
import { invokeImageExplainerMainCapability } from "../capabilities";

describe("image.explainer capabilities", () => {
  it("exposes expected capability catalog", () => {
    expect(imageExplainerMainView.route.full_path).toBe("/views/image/explainer");
    expect(imageExplainerMainView.capabilities.map((item) => item.id)).toEqual([
      "image.set_pages",
      "image.show_page",
      "image.set_title",
      "image.highlight_region",
      "image.clear_highlight",
      "image.get_scene_state",
    ]);

    const setPages = imageExplainerMainView.capabilities.find((item) => item.id === "image.set_pages");
    const inputSchema = (setPages?.input_schema || {}) as Record<string, unknown>;
    const properties = (inputSchema.properties || {}) as Record<string, unknown>;
    const pagesProperty = (properties.pages || {}) as Record<string, unknown>;
    const pageSchema = (pagesProperty.items || {}) as Record<string, unknown>;
    const variants = Array.isArray(pageSchema?.oneOf) ? pageSchema.oneOf as Array<Record<string, unknown>> : [];

    expect(variants).toHaveLength(2);
    expect(variants[0]).toEqual(expect.objectContaining({
      properties: expect.objectContaining({
        layout: { type: "string", enum: ["single"] },
        images: expect.objectContaining({
          minItems: 1,
          maxItems: 1,
        }),
      }),
    }));
    expect(variants[1]).toEqual(expect.objectContaining({
      properties: expect.objectContaining({
        layout: { type: "string", enum: ["split"] },
        images: expect.objectContaining({
          minItems: 2,
          maxItems: 2,
        }),
      }),
    }));
  });

  it("sets pages and normalizes split layout decks", async () => {
    const result = await invokeImageExplainerMainCapability("image.set_pages", {
      title: "Ocean Deck",
      current_page_index: 0,
      pages: [
        {
          id: "page-1",
          title: "Compare species",
          layout: "split",
          images: [
            { id: "left", src: "https://example.com/whale.png", alt: "Whale" },
            { id: "right", src: "https://example.com/shark.png", alt: "Shark" },
          ],
        },
      ],
    }, IMAGE_EXPLAINER_DEFAULT_RESOURCE);

    expect(result).toEqual(expect.objectContaining({
      activeAnchor: "image.stage",
      data: expect.objectContaining({
        status: "applied",
        page_count: 1,
        current_page_index: 0,
      }),
      resource: expect.objectContaining({
        data: expect.objectContaining({
          deck: expect.objectContaining({
            title: "Ocean Deck",
            pages: [
              expect.objectContaining({
                layout: "split",
                images: expect.arrayContaining([
                  expect.objectContaining({ id: "left" }),
                  expect.objectContaining({ id: "right" }),
                ]),
              }),
            ],
          }),
        }),
      }),
    }));
  });

  it("highlights regions on the current page and clears them", async () => {
    const resource = normalizeImageExplainerResource({
      resource_type: "image.deck",
      data: {
        deck: {
          title: "Volcano Deck",
          current_page_index: 0,
          pages: [
            {
              id: "page-1",
              layout: "single",
              images: [
                { id: "hero", src: "https://example.com/volcano.png" },
              ],
            },
          ],
        },
      },
    });

    const highlightResult = await invokeImageExplainerMainCapability("image.highlight_region", {
      highlights: [
        {
          target_image_id: "hero",
          shape: "circle",
          x: 0.4,
          y: 0.3,
          radius: 0.18,
          label: "Crater",
        },
      ],
    }, resource);

    expect(highlightResult).toEqual(expect.objectContaining({
      data: expect.objectContaining({
        highlight_count: 1,
      }),
      resource: expect.objectContaining({
        data: expect.objectContaining({
          deck: expect.objectContaining({
            pages: [
              expect.objectContaining({
                highlights: [
                  expect.objectContaining({
                    target_image_id: "hero",
                    shape: "circle",
                    label: "Crater",
                  }),
                ],
              }),
            ],
          }),
        }),
      }),
    }));

    const nextResource = "ok" in highlightResult && highlightResult.ok === false
      ? resource
      : (highlightResult.resource || resource);
    const cleared = await invokeImageExplainerMainCapability("image.clear_highlight", {}, nextResource);
    expect(cleared).toEqual(expect.objectContaining({
      data: expect.objectContaining({
        highlight_count: 0,
      }),
      resource: expect.objectContaining({
        data: expect.objectContaining({
          deck: expect.objectContaining({
            pages: [
              expect.objectContaining({
                highlights: [],
              }),
            ],
          }),
        }),
      }),
    }));
  });

  it("reads current scene state", async () => {
    const resource = normalizeImageExplainerResource({
      resource_type: "image.deck",
      data: {
        deck: {
          title: "Animal Deck",
          current_page_index: 0,
          pages: [
            {
              id: "page-1",
              layout: "single",
              images: [
                { id: "hero", src: "https://example.com/cat.png" },
              ],
              highlights: [
                { target_image_id: "hero", shape: "rect", x: 0.2, y: 0.2, width: 0.2, height: 0.2 },
              ],
            },
          ],
        },
      },
    });

    const result = await invokeImageExplainerMainCapability("image.get_scene_state", {}, resource);

    expect(result).toEqual(expect.objectContaining({
      activeAnchor: "image.header",
      data: {
        status: "applied",
        deck_title: "Animal Deck",
        page_count: 1,
        current_page_index: 0,
        current_page_id: "page-1",
        current_layout: "single",
        current_image_count: 1,
        current_highlight_count: 1,
      },
    }));
  });

  it("includes narration-first examples for guided image explanation", () => {
    expect(imageExplainerMainView.interaction_hints).toEqual(expect.objectContaining({
      recommended_mode: "session_start",
      decision_rule: expect.stringContaining("guide.narrate"),
      examples: expect.arrayContaining([
        expect.objectContaining({
          name: "session_narrate_show_page_highlight",
          call: expect.objectContaining({
            payload: expect.objectContaining({
              steps: expect.arrayContaining([
                expect.objectContaining({
                  action: expect.objectContaining({
                    type: "guide.narrate",
                    payload: expect.objectContaining({
                      text: expect.any(String),
                    }),
                  }),
                }),
                expect.objectContaining({
                  action: expect.objectContaining({
                    type: "view.capability.invoke",
                    payload: expect.objectContaining({
                      capability_id: "image.show_page",
                      input: expect.objectContaining({
                        page_index: 1,
                      }),
                    }),
                  }),
                }),
                expect.objectContaining({
                  action: expect.objectContaining({
                    type: "view.capability.invoke",
                    payload: expect.objectContaining({
                      capability_id: "image.highlight_region",
                      input: expect.objectContaining({
                        highlights: expect.any(Array),
                      }),
                    }),
                  }),
                }),
              ]),
            }),
          }),
        }),
      ]),
    }));
  });
});
