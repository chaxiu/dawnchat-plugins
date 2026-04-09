export const IMAGE_EXPLAINER_LAYOUTS = ["single", "split"] as const;
export type ImageExplainerLayout = (typeof IMAGE_EXPLAINER_LAYOUTS)[number];

export const IMAGE_EXPLAINER_HIGHLIGHT_SHAPES = ["rect", "circle"] as const;
export type ImageExplainerHighlightShape = (typeof IMAGE_EXPLAINER_HIGHLIGHT_SHAPES)[number];

export interface ImageExplainerImageItem {
  id: string;
  src: string;
  alt: string;
  caption: string;
}

export interface ImageExplainerHighlight {
  id: string;
  target_image_id: string;
  shape: ImageExplainerHighlightShape;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  label: string;
}

export interface ImageExplainerPage {
  id: string;
  title: string;
  layout: ImageExplainerLayout;
  images: ImageExplainerImageItem[];
  highlights: ImageExplainerHighlight[];
}

export interface ImageExplainerDeckState {
  title: string;
  current_page_index: number;
  pages: ImageExplainerPage[];
}

export interface ImageExplainerResourceData {
  deck: ImageExplainerDeckState;
}

export function createDefaultImageExplainerResourceData(): ImageExplainerResourceData {
  return {
    deck: {
      title: "AI Visual Explainer",
      current_page_index: 0,
      pages: [],
    },
  };
}
