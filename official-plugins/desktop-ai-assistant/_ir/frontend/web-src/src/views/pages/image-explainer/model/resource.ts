import type {
  ViewOpenSuccess,
  ViewOperationFailure,
  ViewResourceBinding,
} from "../../../../runtime/view/manifest";
import {
  buildOperationError,
  cloneViewResource,
  isViewOperationFailure,
  toRecord,
} from "../../../shared/viewUtils";
import {
  createDefaultImageExplainerResourceData,
  IMAGE_EXPLAINER_HIGHLIGHT_SHAPES,
  IMAGE_EXPLAINER_LAYOUTS,
  type ImageExplainerHighlight,
  type ImageExplainerImageItem,
  type ImageExplainerLayout,
  type ImageExplainerPage,
  type ImageExplainerResourceData,
} from "./types";

const IMAGE_EXPLAINER_RESOURCE_TYPE = "image.deck";
const IMAGE_EXPLAINER_RESOURCE_ID = "image:explainer-demo";
const IMAGE_EXPLAINER_RESOURCE_TITLE = "AI Visual Explainer";

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeImage(raw: unknown, index: number): ImageExplainerImageItem {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const src = normalizeString(source.src);
  return {
    id: normalizeString(source.id, `image-${index + 1}`) || `image-${index + 1}`,
    src,
    alt: normalizeString(source.alt, src || `Image ${index + 1}`),
    caption: normalizeString(source.caption),
  };
}

function normalizeHighlight(raw: unknown, index: number, images: ImageExplainerImageItem[]): ImageExplainerHighlight | null {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const fallbackImageId = images[0]?.id || "";
  const targetImageId = normalizeString(source.target_image_id, fallbackImageId);
  if (!targetImageId || !images.some((item) => item.id === targetImageId)) {
    return null;
  }
  const shape = IMAGE_EXPLAINER_HIGHLIGHT_SHAPES.includes(source.shape as ImageExplainerHighlight["shape"])
    ? source.shape as ImageExplainerHighlight["shape"]
    : "rect";
  return {
    id: normalizeString(source.id, `highlight-${index + 1}`) || `highlight-${index + 1}`,
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

function normalizePage(raw: unknown, index: number): ImageExplainerPage {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const layout = IMAGE_EXPLAINER_LAYOUTS.includes(source.layout as ImageExplainerLayout)
    ? source.layout as ImageExplainerLayout
    : "single";
  const rawImages = Array.isArray(source.images) ? source.images : [];
  const images = rawImages.map((item, imageIndex) => normalizeImage(item, imageIndex)).filter((item) => item.src.length > 0);
  const rawHighlights = Array.isArray(source.highlights) ? source.highlights : [];
  const highlights = rawHighlights
    .map((item, highlightIndex) => normalizeHighlight(item, highlightIndex, images))
    .filter((item): item is ImageExplainerHighlight => item !== null);
  return {
    id: normalizeString(source.id, `page-${index + 1}`) || `page-${index + 1}`,
    title: normalizeString(source.title),
    layout,
    images,
    highlights,
  };
}

function validatePages(pages: ImageExplainerPage[]): ViewOperationFailure | null {
  for (const page of pages) {
    if (page.layout === "single" && page.images.length !== 1) {
      return buildOperationError(
        "invalid_view_resource",
        "image.explainer requires single layout pages to contain exactly one image"
      );
    }
    if (page.layout === "split" && page.images.length !== 2) {
      return buildOperationError(
        "invalid_view_resource",
        "image.explainer requires split layout pages to contain exactly two images"
      );
    }
  }
  return null;
}

export const IMAGE_EXPLAINER_DEFAULT_RESOURCE: ViewResourceBinding = {
  resource_type: IMAGE_EXPLAINER_RESOURCE_TYPE,
  resource_id: IMAGE_EXPLAINER_RESOURCE_ID,
  title: IMAGE_EXPLAINER_RESOURCE_TITLE,
  data: createDefaultImageExplainerResourceData() as unknown as Record<string, unknown>,
};

export function cloneImageExplainerResource(resource: ViewResourceBinding): ViewResourceBinding {
  return cloneViewResource(resource);
}

export function readImageExplainerResourceData(resource: ViewResourceBinding): ImageExplainerResourceData {
  return resource.data as unknown as ImageExplainerResourceData;
}

export function normalizeImageExplainerResource(raw: Record<string, unknown>): ViewResourceBinding {
  const defaults = createDefaultImageExplainerResourceData();
  const rawData = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
    ? raw.data as Record<string, unknown>
    : {};
  const rawDeck = rawData.deck && typeof rawData.deck === "object" && !Array.isArray(rawData.deck)
    ? rawData.deck as Record<string, unknown>
    : {};
  const pages = Array.isArray(rawDeck.pages)
    ? rawDeck.pages.map((item, index) => normalizePage(item, index))
    : defaults.deck.pages;
  const maxPageIndex = Math.max(0, pages.length - 1);
  return {
    resource_type: IMAGE_EXPLAINER_RESOURCE_TYPE,
    resource_id: normalizeString(raw.resource_id, IMAGE_EXPLAINER_RESOURCE_ID) || IMAGE_EXPLAINER_RESOURCE_ID,
    title: normalizeString(raw.title, IMAGE_EXPLAINER_RESOURCE_TITLE) || IMAGE_EXPLAINER_RESOURCE_TITLE,
    data: {
      deck: {
        title: normalizeString(rawDeck.title, defaults.deck.title),
        current_page_index: pages.length === 0
          ? 0
          : Math.trunc(clampNumber(rawDeck.current_page_index, defaults.deck.current_page_index, 0, maxPageIndex)),
        pages,
      },
    } as unknown as Record<string, unknown>,
  };
}

export function validateImageExplainerResource(
  payload: Record<string, unknown>
): ViewResourceBinding | ViewOperationFailure {
  if (Object.keys(payload).length === 0) {
    return cloneImageExplainerResource(IMAGE_EXPLAINER_DEFAULT_RESOURCE);
  }
  const resourceType = normalizeString(payload.resource_type, IMAGE_EXPLAINER_RESOURCE_TYPE);
  if (resourceType !== IMAGE_EXPLAINER_RESOURCE_TYPE) {
    return buildOperationError(
      "invalid_view_resource",
      `image.explainer requires resource.resource_type to be '${IMAGE_EXPLAINER_RESOURCE_TYPE}'`
    );
  }
  const rawData = payload.data;
  if (rawData !== undefined && (!rawData || typeof rawData !== "object" || Array.isArray(rawData))) {
    return buildOperationError(
      "invalid_view_resource",
      "image.explainer requires resource.data to be an object"
    );
  }
  const normalized = normalizeImageExplainerResource(payload);
  const deck = readImageExplainerResourceData(normalized).deck;
  const pageValidation = validatePages(deck.pages);
  if (pageValidation) {
    return pageValidation;
  }
  return normalized;
}

export function openImageExplainerMainView(payload: Record<string, unknown>): ViewOpenSuccess | ViewOperationFailure {
  const input = toRecord(payload);
  const normalizedResource = validateImageExplainerResource(toRecord(input.resource));
  if (isViewOperationFailure(normalizedResource)) {
    return normalizedResource;
  }
  const initialAnchor = typeof input.initial_anchor === "string" ? input.initial_anchor.trim() : "";
  return {
    resource: normalizedResource,
    activeAnchor: initialAnchor || "image.stage",
    data: {
      status: "applied",
      resource_id: normalizedResource.resource_id || "",
      current_page_index: readImageExplainerResourceData(normalizedResource).deck.current_page_index,
    },
  };
}
