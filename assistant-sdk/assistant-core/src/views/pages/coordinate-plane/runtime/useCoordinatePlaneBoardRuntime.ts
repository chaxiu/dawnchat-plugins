import JXG from "jsxgraph";
import { ref, type ComponentPublicInstance, type ComputedRef } from "vue";

import { ASSISTANT_RUNTIME_EVENT_TYPES } from "../../../../runtime/events";
import { emitAssistantRuntimeEvent } from "../../../../runtime/runtimeEventBridge";
import type { CoordinatePlaneResourceData } from "../model/types";
import { buildAspectSafeBoundingBox } from "./planeGeometry";
import {
  applyVisualState,
  createSceneElement,
  type JxgBoardLike,
  type JxgElementLike,
  type PlaneRenderedSceneEntry,
} from "./jxgSceneFactory";
import type { PlaneLabelLayoutContext } from "./planeLabelLayout";

interface RuntimeBoard extends JxgBoardLike {
  removeObject: (element: unknown) => void;
  setBoundingBox: (box: readonly [number, number, number, number], keepAspect: boolean) => void;
  update: () => void;
  resizeContainer: (width: number, height: number, ignoreRatio: boolean) => void;
}

export function useCoordinatePlaneBoardRuntime(params: {
  scene: ComputedRef<CoordinatePlaneResourceData | null>;
}) {
  const { scene } = params;

  const boardContainer = ref<HTMLElement | null>(null);
  const boardError = ref("");
  const renderToken = ref(0);

  const jxg = JXG as unknown as {
    JSXGraph: {
      initBoard: (element: HTMLElement, options: Record<string, unknown>) => RuntimeBoard;
      freeBoard: (board: RuntimeBoard) => void;
    };
  };

  let board: RuntimeBoard | null = null;
  let gridElement: JxgElementLike | null = null;
  let axisXElement: JxgElementLike | null = null;
  let axisYElement: JxgElementLike | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let animationFrameId = 0;
  let lastAnimationToken = -1;
  const renderedElements = new Map<string, PlaneRenderedSceneEntry>();

  function getLayoutContext(): PlaneLabelLayoutContext | null {
    if (!scene.value) {
      return null;
    }
    return {
      viewport: scene.value.viewport,
      containerWidth: boardContainer.value?.clientWidth || 0,
      containerHeight: boardContainer.value?.clientHeight || 0,
    };
  }

  function stopAnimation() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
  }

  function setBoardContainer(element: Element | ComponentPublicInstance | null) {
    boardContainer.value = element as HTMLElement | null;
  }

  function clearSceneElements() {
    if (!board) {
      return;
    }
    for (const entry of renderedElements.values()) {
      board.removeObject(entry.element);
      for (const extraElement of entry.extraElements || []) {
        board.removeObject(extraElement);
      }
    }
    renderedElements.clear();
  }

  function destroyBoard() {
    stopAnimation();
    clearSceneElements();
    gridElement = null;
    axisXElement = null;
    axisYElement = null;
    if (board) {
      jxg.JSXGraph.freeBoard(board);
      board = null;
    }
  }

  function ensureBoard() {
    if (board || !boardContainer.value) {
      return;
    }
    try {
      board = jxg.JSXGraph.initBoard(boardContainer.value, {
        boundingbox: [-10, 6, 10, -6],
        axis: false,
        grid: false,
        showNavigation: false,
        showCopyright: false,
        keepaspectratio: true,
        pan: { enabled: false },
        zoom: { enabled: false },
      });
      boardError.value = "";
    } catch (error) {
      boardError.value = error instanceof Error ? error.message : "Unable to initialize coordinate board.";
    }
  }

  function ensureViewportElements() {
    if (!board || !scene.value) {
      return;
    }
    const containerWidth = boardContainer.value?.clientWidth || 0;
    const containerHeight = boardContainer.value?.clientHeight || 0;
    board.setBoundingBox(buildAspectSafeBoundingBox(scene.value.viewport, containerWidth, containerHeight), true);

    if (!gridElement) {
      gridElement = board.create("grid", []) as JxgElementLike;
    }
    gridElement.setAttribute({
      visible: scene.value.viewport.show_grid,
      strokeColor: "rgba(120, 146, 180, 0.18)",
    });

    if (!axisXElement) {
      axisXElement = board.create("line", [[0, 0], [1, 0]], {
        straightFirst: true,
        straightLast: true,
        fixed: true,
        highlight: false,
        strokeColor: "#88a7d4",
        strokeWidth: 1,
        dash: 0,
      }) as JxgElementLike;
    }
    if (!axisYElement) {
      axisYElement = board.create("line", [[0, 0], [0, 1]], {
        straightFirst: true,
        straightLast: true,
        fixed: true,
        highlight: false,
        strokeColor: "#88a7d4",
        strokeWidth: 1,
        dash: 0,
      }) as JxgElementLike;
    }
    axisXElement.setAttribute({ visible: scene.value.viewport.show_axes });
    axisYElement.setAttribute({ visible: scene.value.viewport.show_axes });
  }

  function applyHighlights() {
    if (!scene.value) {
      return;
    }
    const highlightColorByTarget = new Map<string, string>();
    for (const highlight of scene.value.highlights) {
      for (const targetId of highlight.target_ids) {
        highlightColorByTarget.set(targetId, highlight.color || "#ffe08a");
      }
    }
    for (const [objectId, entry] of renderedElements.entries()) {
      const highlightColor = highlightColorByTarget.get(objectId);
      if (highlightColor) {
        applyVisualState(entry.element, {
          color: highlightColor,
          fillColor: highlightColor,
          width: Math.max(entry.width + 1, 3),
          opacity: entry.opacity,
        });
        continue;
      }
      applyVisualState(entry.element, {
        color: entry.color,
        fillColor: entry.fillColor,
        width: entry.width,
        opacity: entry.opacity,
      });
    }
  }

  function getElementPosition(element: JxgElementLike | undefined | null) {
    const coords = element?.coords?.usrCoords;
    if (!Array.isArray(coords) || coords.length < 3) {
      return null;
    }
    return {
      x: Number(coords[1] || 0),
      y: Number(coords[2] || 0),
    };
  }

  function emitAnimationCompleted(objectId: string, to: { x: number; y: number }) {
    emitAssistantRuntimeEvent({
      type: ASSISTANT_RUNTIME_EVENT_TYPES.PLANE_ANIMATION_COMPLETED,
      source: "view",
      payload: {
        view_id: "plane.main",
        object_id: objectId,
        to_x: to.x,
        to_y: to.y,
      },
    });
  }

  function animateRenderedObject(
    objectId: string,
    from: { x: number; y: number },
    to: { x: number; y: number },
    durationMs: number
  ) {
    const entry = renderedElements.get(objectId);
    if (!entry || !board) {
      return;
    }
    const activeBoard = board;
    const element = entry.element;
    if (durationMs <= 0) {
      element.moveTo?.([to.x, to.y], 0);
      activeBoard.update();
      emitAnimationCompleted(objectId, to);
      return;
    }
    const startedAt = performance.now();
    const frame = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const currentX = from.x + ((to.x - from.x) * progress);
      const currentY = from.y + ((to.y - from.y) * progress);
      element.moveTo?.([currentX, currentY], 0);
      activeBoard.update();
      if (progress >= 1) {
        animationFrameId = 0;
        emitAnimationCompleted(objectId, to);
        return;
      }
      animationFrameId = requestAnimationFrame(frame);
    };
    stopAnimation();
    animationFrameId = requestAnimationFrame(frame);
  }

  function syncBoard() {
    ensureBoard();
    if (!board || !scene.value) {
      renderToken.value += 1;
      return;
    }
    ensureViewportElements();
    const animationState = scene.value.animation_state;
    const shouldAnimate = animationState.status === "playing"
      && animationState.object_id.length > 0
      && animationState.token !== lastAnimationToken;
    const previousTarget = shouldAnimate
      ? getElementPosition(renderedElements.get(animationState.object_id)?.element)
      : null;
    const layoutContext = getLayoutContext();

    clearSceneElements();
    if (layoutContext) {
      for (const object of scene.value.objects) {
        const renderSource = shouldAnimate
          && object.type === "object"
          && object.id === animationState.object_id
          ? {
            ...object,
            x: previousTarget?.x ?? animationState.from_x,
            y: previousTarget?.y ?? animationState.from_y,
          }
          : object;
        const created = createSceneElement(board, renderSource as unknown as Record<string, unknown>, layoutContext);
        if (created) {
          renderedElements.set(object.id, created);
        }
      }
    }
    applyHighlights();
    board.update();
    renderToken.value += 1;

    if (shouldAnimate) {
      lastAnimationToken = animationState.token;
      animateRenderedObject(
        animationState.object_id,
        previousTarget ?? { x: animationState.from_x, y: animationState.from_y },
        { x: animationState.to_x, y: animationState.to_y },
        animationState.duration_ms
      );
      return;
    }
    if (animationState.status !== "playing") {
      lastAnimationToken = animationState.token;
    }
  }

  function mount() {
    syncBoard();
    if (typeof ResizeObserver !== "undefined" && boardContainer.value) {
      resizeObserver = new ResizeObserver(() => {
        if (!board || !boardContainer.value) {
          return;
        }
        board.resizeContainer(boardContainer.value.clientWidth, boardContainer.value.clientHeight, true);
        ensureViewportElements();
        board.update();
      });
      resizeObserver.observe(boardContainer.value);
    }
  }

  function unmount() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    destroyBoard();
  }

  function deactivate() {
    destroyBoard();
    boardError.value = "";
    renderToken.value += 1;
  }

  return {
    boardError,
    renderToken,
    setBoardContainer,
    syncBoard,
    mount,
    unmount,
    deactivate,
  };
}
