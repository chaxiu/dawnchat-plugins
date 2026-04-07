import {
  buildImageExplainerMainStateSummary,
  IMAGE_EXPLAINER_DEFAULT_RESOURCE,
  normalizeImageExplainerResource,
} from "../imageExplainerMain.view";

describe("image.explainer summary", () => {
  it("builds summary with current page layout and highlight counts", () => {
    const resource = normalizeImageExplainerResource({
      resource_type: "image.deck",
      title: "Animal Deck",
      data: {
        deck: {
          title: "Animal Deck",
          current_page_index: 1,
          pages: [
            {
              id: "page-a",
              title: "Page A",
              layout: "single",
              images: [{ id: "lion", src: "https://example.com/lion.png" }],
            },
            {
              id: "page-b",
              title: "Page B",
              layout: "split",
              images: [
                { id: "cat", src: "https://example.com/cat.png" },
                { id: "tiger", src: "https://example.com/tiger.png" },
              ],
              highlights: [
                { target_image_id: "cat", shape: "rect", x: 0.5, y: 0.5, width: 0.2, height: 0.2 },
              ],
            },
          ],
        },
      },
    });

    const summary = buildImageExplainerMainStateSummary(resource, "image.stage");

    expect(summary).toEqual({
      resource_title: "Animal Deck",
      deck_title: "Animal Deck",
      page_count: 2,
      current_page_index: 1,
      current_page_id: "page-b",
      current_page_title: "Page B",
      current_layout: "split",
      current_image_count: 2,
      current_image_ids: ["cat", "tiger"],
      current_highlight_count: 1,
      active_anchor: "image.stage",
    });
  });

  it("keeps default summary empty when no pages exist", () => {
    const summary = buildImageExplainerMainStateSummary(IMAGE_EXPLAINER_DEFAULT_RESOURCE, "image.stage");

    expect(summary).toEqual({
      resource_title: "AI Visual Explainer",
      deck_title: "AI Visual Explainer",
      page_count: 0,
      current_page_index: 0,
      current_page_id: "",
      current_page_title: "",
      current_layout: "",
      current_image_count: 0,
      current_image_ids: [],
      current_highlight_count: 0,
      active_anchor: "image.stage",
    });
  });
});
