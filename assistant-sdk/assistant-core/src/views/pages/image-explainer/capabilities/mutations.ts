import type { ViewCapabilityResult, ViewResourceBinding } from "../../../../runtime/view";
import { buildOperationError } from "../../../shared/viewUtils";
import {
  cloneImageExplainerResource,
  readImageExplainerResourceData,
} from "../model/resource";
import {
  IMAGE_EXPLAINER_HIGHLIGHT_SHAPES,
  IMAGE_EXPLAINER_LAYOUTS,
  type ImageExplainerHighlight,
  type ImageExplainerImageItem,
  type ImageExplainerLayout,
  type ImageExplainerPage,
} from "../model/types";

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeImage(raw: unknown, index: number): ImageExplainerImageItem | null {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const src = normalizeString(source.src);
  if (!src) {
    return null;
  }
  return {
    id: normalizeString(source.id) || `image-${index + 1}`,
    src,
    alt: normalizeString(source.alt) || src,
    caption: normalizeString(source.caption),
  };
}

function normalizeHighlight(
  raw: unknown,
  index: number,
  images: ImageExplainerImageItem[]
): ImageExplainerHighlight | null {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const targetImageId = normalizeString(source.target_image_id) || images[0]?.id || "";
  if (!targetImageId || !images.some((item) => item.id === targetImageId)) {
    return null;
  }
  const shape = IMAGE_EXPLAINER_HIGHLIGHT_SHAPES.includes(source.shape as ImageExplainerHighlight["shape"])
    ? source.shape as ImageExplainerHighlight["shape"]
    : "rect";
  return {
    id: normalizeString(source.id) || `highlight-${index + 1}`,
    target_image_id: targetImageId,
    shape,
    x: clampNumber(source.x, 0.5, 0, 1),
    y: clampNumber(source.y, 0.5, 0, 1),
    width: clampNumber(source.width, 0.28, 0, 1),
    height: clampNumber(source.height, 0.28, 0, 1),
    radius: clampNumber(source.radius, 0.14, 0, 1),
    label: normalizeString(source.label),
  };
}

function normalizePage(raw: unknown, index: number): ImageExplainerPage | null {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const layout = IMAGE_EXPLAINER_LAYOUTS.includes(source.layout as ImageExplainerLayout)
    ? source.layout as ImageExplainerLayout
    : "single";
  const images = Array.isArray(source.images)
    ? source.images.map((item, imageIndex) => normalizeImage(item, imageIndex)).filter((item): item is ImageExplainerImageItem => item !== null)
    : [];
  if ((layout === "single" && images.length !== 1) || (layout === "split" && images.length !== 2)) {
    return null;
  }
  const highlights = Array.isArray(source.highlights)
    ? source.highlights
      .map((item, highlightIndex) => normalizeHighlight(item, highlightIndex, images))
      .filter((item): item is ImageExplainerHighlight => item !== null)
    : [];
  return {
    id: normalizeString(source.id) || `page-${index + 1}`,
    title: normalizeString(source.title),
    layout,
    images,
    highlights,
  };
}

export function mutateSetPages(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const rawPages = Array.isArray(input.pages) ? input.pages : null;
  if (!rawPages) {
    return buildOperationError(
      "invalid_view_capability_input",
      "image.set_pages requires input.pages as an array"
    );
  }
  const normalizedPages = rawPages
    .map((item, index) => normalizePage(item, index))
    .filter((item): item is ImageExplainerPage => item !== null);
  if (normalizedPages.length !== rawPages.length) {
    return buildOperationError(
      "invalid_view_capability_input",
      "image.set_pages requires each page to use single layout with one image or split layout with two images"
    );
  }
  const nextResource = cloneImageExplainerResource(resource);
  const deck = readImageExplainerResourceData(nextResource).deck;
  deck.pages = normalizedPages;
  deck.title = normalizeString(input.title) || deck.title;
  const maxPageIndex = Math.max(0, normalizedPages.length - 1);
  deck.current_page_index = normalizedPages.length === 0
    ? 0
    : Math.trunc(clampNumber(input.current_page_index, 0, 0, maxPageIndex));
  return {
    resource: nextResource,
    activeAnchor: "image.stage",
    data: {
      status: "applied",
      page_count: deck.pages.length,
      current_page_index: deck.current_page_index,
    },
  };
}

export function mutateShowPage(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const pageIndex = input.page_index;
  if (typeof pageIndex !== "number" || Number.isNaN(pageIndex)) {
    return buildOperationError(
      "invalid_view_capability_input",
      "image.show_page requires input.page_index as a number"
    );
  }
  const nextResource = cloneImageExplainerResource(resource);
  const deck = readImageExplainerResourceData(nextResource).deck;
  if (pageIndex < 0 || pageIndex >= deck.pages.length) {
    return buildOperationError(
      "image_page_not_found",
      `Image page not found: ${pageIndex}`
    );
  }
  deck.current_page_index = Math.trunc(pageIndex);
  return {
    resource: nextResource,
    activeAnchor: "image.stage",
    data: {
      status: "applied",
      current_page_index: deck.current_page_index,
      current_page_id: deck.pages[deck.current_page_index]?.id || "",
    },
  };
}

export function mutateSetTitle(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const title = normalizeString(input.title);
  if (!title) {
    return buildOperationError(
      "invalid_view_capability_input",
      "image.set_title requires input.title"
    );
  }
  const nextResource = cloneImageExplainerResource(resource);
  const deck = readImageExplainerResourceData(nextResource).deck;
  deck.title = title;
  nextResource.title = title;
  return {
    resource: nextResource,
    activeAnchor: "image.header",
    data: {
      status: "applied",
      title,
    },
  };
}

export function mutateHighlightRegion(
  resource: ViewResourceBinding,
  input: Record<string, unknown>
): ViewCapabilityResult {
  const nextResource = cloneImageExplainerResource(resource);
  const deck = readImageExplainerResourceData(nextResource).deck;
  const currentPage = deck.pages[deck.current_page_index];
  if (!currentPage) {
    return buildOperationError(
      "image_page_not_found",
      "image.highlight_region requires an existing current page"
    );
  }
  const rawHighlights = Array.isArray(input.highlights) ? input.highlights : [input];
  const highlights = rawHighlights
    .map((item, index) => normalizeHighlight(item, index, currentPage.images))
    .filter((item): item is ImageExplainerHighlight => item !== null);
  if (highlights.length === 0) {
    return buildOperationError(
      "invalid_view_capability_input",
      "image.highlight_region requires one valid highlight targeting an image on the current page"
    );
  }
  currentPage.highlights = highlights;
  return {
    resource: nextResource,
    activeAnchor: "image.stage",
    data: {
      status: "applied",
      highlight_count: currentPage.highlights.length,
      current_page_id: currentPage.id,
    },
  };
}

export function mutateClearHighlight(resource: ViewResourceBinding): ViewCapabilityResult {
  const nextResource = cloneImageExplainerResource(resource);
  const deck = readImageExplainerResourceData(nextResource).deck;
  const currentPage = deck.pages[deck.current_page_index];
  if (currentPage) {
    currentPage.highlights = [];
  }
  return {
    resource: nextResource,
    activeAnchor: "image.stage",
    data: {
      status: "applied",
      highlight_count: 0,
      current_page_id: currentPage?.id || "",
    },
  };
}
