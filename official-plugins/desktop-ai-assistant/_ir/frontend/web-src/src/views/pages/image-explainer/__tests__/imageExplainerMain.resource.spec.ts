import {
  openImageExplainerMainView,
  validateImageExplainerResource,
} from "../imageExplainerMain.view";

describe("image.explainer resource", () => {
  it("opens image.explainer with normalized single-image payload", () => {
    const result = openImageExplainerMainView({
      resource: {
        resource_type: "image.deck",
        title: "Volcano Deck",
        data: {
          deck: {
            title: "Volcano Deck",
            current_page_index: 0,
            pages: [
              {
                id: "page-1",
                title: "Volcano Structure",
                layout: "single",
                images: [
                  {
                    id: "hero",
                    src: "https://example.com/volcano.png",
                    alt: "Volcano cross section",
                  },
                ],
                highlights: [
                  {
                    id: "focus-1",
                    target_image_id: "hero",
                    shape: "rect",
                    x: 0.4,
                    y: 0.45,
                    width: 0.28,
                    height: 0.2,
                    label: "Magma chamber",
                  },
                ],
              },
            ],
          },
        },
      },
    });

    expect(result).toEqual(expect.objectContaining({
      resource: expect.objectContaining({
        resource_type: "image.deck",
        title: "Volcano Deck",
        data: expect.objectContaining({
          deck: expect.objectContaining({
            title: "Volcano Deck",
            current_page_index: 0,
            pages: [
              expect.objectContaining({
                layout: "single",
                images: [
                  expect.objectContaining({
                    id: "hero",
                    src: "https://example.com/volcano.png",
                  }),
                ],
              }),
            ],
          }),
        }),
      }),
      activeAnchor: "image.stage",
    }));
  });

  it("rejects invalid split page image counts", () => {
    const result = validateImageExplainerResource({
      resource_type: "image.deck",
      data: {
        deck: {
          pages: [
            {
              layout: "split",
              images: [
                { src: "https://example.com/only-one.png" },
              ],
            },
          ],
        },
      },
    });

    expect(result).toEqual({
      ok: false,
      error_code: "invalid_view_resource",
      message: "image.explainer requires split layout pages to contain exactly two images",
      data: undefined,
    });
  });
});
