import { mount } from "@vue/test-utils";

import { createManifestSnapshot } from "../../../../runtime/view";
import { useViewState } from "../../../../runtime/view/state";
import ImageExplainerMainView from "../ImageExplainerMainView.vue";
import {
  cloneImageExplainerResource,
  imageExplainerMainView,
  normalizeImageExplainerResource,
} from "../imageExplainerMain.view";

function activateView(resource = cloneImageExplainerResource(normalizeImageExplainerResource({
  binding_type: "image.deck",
  data: {
    deck: {
      title: "Animal Deck",
      current_page_index: 0,
      pages: [
        {
          id: "page-1",
          title: "Animal Hero",
          layout: "single",
          images: [
            {
              id: "hero",
              src: "https://example.com/cat.png",
              alt: "Cat",
            },
          ],
        },
      ],
    },
  },
}))) {
  useViewState().setActiveViewState({
    viewId: "image.explainer",
    activeAnchor: "image.stage",
    state_binding: resource,
    manifest: createManifestSnapshot(imageExplainerMainView, resource, "image.stage"),
  });
}

describe("ImageExplainerMainView", () => {
  afterEach(() => {
    useViewState().clearViewState();
  });

  it("renders single-image stage with floating title", () => {
    activateView();
    const wrapper = mount(ImageExplainerMainView);

    expect(wrapper.text()).toContain("Animal Hero");
    expect(wrapper.find(".floating-title").exists()).toBe(true);
    expect(wrapper.findAll(".image-panel")).toHaveLength(1);
    expect(wrapper.find(".image-stage.is-single").exists()).toBe(true);
    expect(wrapper.find(".image-stage.is-split").exists()).toBe(false);
  });

  it("renders split-image layout and highlight overlay", () => {
    const resource = normalizeImageExplainerResource({
      binding_type: "image.deck",
      data: {
        deck: {
          title: "Compare Planets",
          current_page_index: 0,
          pages: [
            {
              id: "page-1",
              title: "Mars vs Earth",
              layout: "split",
              images: [
                { id: "mars", src: "https://example.com/mars.png", alt: "Mars" },
                { id: "earth", src: "https://example.com/earth.png", alt: "Earth" },
              ],
              highlights: [
                {
                  id: "focus-1",
                  target_image_id: "mars",
                  shape: "rect",
                  x: 0.5,
                  y: 0.4,
                  width: 0.2,
                  height: 0.18,
                  label: "Polar cap",
                },
              ],
            },
          ],
        },
      },
    });
    activateView(resource);
    const wrapper = mount(ImageExplainerMainView);

    expect(wrapper.find(".image-stage.is-split").exists()).toBe(true);
    expect(wrapper.findAll(".image-panel")).toHaveLength(2);
    expect(wrapper.findAll(".highlight-region")).toHaveLength(1);
    expect(wrapper.text()).toContain("Polar cap");
  });

  it("shows idle copy when the image explainer scene is not active", () => {
    const wrapper = mount(ImageExplainerMainView);

    expect(wrapper.text()).toContain("Waiting for");
    expect(wrapper.text()).toContain("image.deck");
    expect(wrapper.find(".image-stage").exists()).toBe(false);
  });
});
