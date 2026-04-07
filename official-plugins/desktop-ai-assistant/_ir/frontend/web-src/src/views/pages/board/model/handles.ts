import type {
  BoardHandleSide,
  BoardHandlesMode,
  BoardNode,
} from "./types";

export const BOARD_HANDLE_CORNER_INSET_PX = 18;

export const BOARD_HANDLE_SIDES: BoardHandleSide[] = [
  "left",
  "right",
  "top",
  "bottom",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

type HandleAnchor = {
  x: number;
  y: number;
  normalX: number;
  normalY: number;
};

function normalizeVector(x: number, y: number) {
  const length = Math.hypot(x, y) || 1;
  return {
    x: x / length,
    y: y / length,
  };
}

export function isBoardHandleSide(raw: unknown): raw is BoardHandleSide {
  return typeof raw === "string" && BOARD_HANDLE_SIDES.includes(raw as BoardHandleSide);
}

export function getAvailableHandleSides(mode: BoardHandlesMode): BoardHandleSide[] {
  if (mode === "left-right") {
    return ["left", "right"];
  }
  if (mode === "four-sides") {
    return ["left", "right", "top", "bottom"];
  }
  return BOARD_HANDLE_SIDES;
}

export function getOppositeHandle(handle: BoardHandleSide): BoardHandleSide {
  switch (handle) {
    case "left":
      return "right";
    case "right":
      return "left";
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    case "top-left":
      return "bottom-right";
    case "top-right":
      return "bottom-left";
    case "bottom-left":
      return "top-right";
    case "bottom-right":
      return "top-left";
  }
}

function getHandleAnchor(node: BoardNode, handle: BoardHandleSide): HandleAnchor {
  const left = node.position.x;
  const top = node.position.y;
  const right = left + node.size.width;
  const bottom = top + node.size.height;
  const centerX = left + node.size.width / 2;
  const centerY = top + node.size.height / 2;
  const insetX = Math.min(BOARD_HANDLE_CORNER_INSET_PX, Math.max(10, node.size.width / 4));
  const insetY = Math.min(BOARD_HANDLE_CORNER_INSET_PX, Math.max(10, node.size.height / 4));

  switch (handle) {
    case "left":
      return { x: left, y: centerY, normalX: -1, normalY: 0 };
    case "right":
      return { x: right, y: centerY, normalX: 1, normalY: 0 };
    case "top":
      return { x: centerX, y: top, normalX: 0, normalY: -1 };
    case "bottom":
      return { x: centerX, y: bottom, normalX: 0, normalY: 1 };
    case "top-left":
      return { x: left + insetX, y: top, normalX: -1, normalY: -1 };
    case "top-right":
      return { x: right - insetX, y: top, normalX: 1, normalY: -1 };
    case "bottom-left":
      return { x: left + insetX, y: bottom, normalX: -1, normalY: 1 };
    case "bottom-right":
      return { x: right - insetX, y: bottom, normalX: 1, normalY: 1 };
  }
}

function getNodeCenter(node: BoardNode) {
  return {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  };
}

export function inferClosestHandles(
  sourceNode: BoardNode,
  targetNode: BoardNode,
  mode: BoardHandlesMode
): { sourceHandle: BoardHandleSide; targetHandle: BoardHandleSide } {
  const sourceCandidates = getAvailableHandleSides(mode);
  const targetCandidates = getAvailableHandleSides(mode);
  const sourceCenter = getNodeCenter(sourceNode);
  const targetCenter = getNodeCenter(targetNode);
  const outwardSource = normalizeVector(targetCenter.x - sourceCenter.x, targetCenter.y - sourceCenter.y);
  const outwardTarget = normalizeVector(sourceCenter.x - targetCenter.x, sourceCenter.y - targetCenter.y);

  let bestPair: { sourceHandle: BoardHandleSide; targetHandle: BoardHandleSide } = {
    sourceHandle: sourceCandidates[0] || "right",
    targetHandle: targetCandidates[0] || "left",
  };
  let bestScore = Number.POSITIVE_INFINITY;

  for (const sourceHandle of sourceCandidates) {
    const sourceAnchor = getHandleAnchor(sourceNode, sourceHandle);
    const sourceNormal = normalizeVector(sourceAnchor.normalX, sourceAnchor.normalY);
    const sourceFacingPenalty = (1 - Math.max(0, sourceNormal.x * outwardSource.x + sourceNormal.y * outwardSource.y)) * 72;

    for (const targetHandle of targetCandidates) {
      const targetAnchor = getHandleAnchor(targetNode, targetHandle);
      const targetNormal = normalizeVector(targetAnchor.normalX, targetAnchor.normalY);
      const targetFacingPenalty = (1 - Math.max(0, targetNormal.x * outwardTarget.x + targetNormal.y * outwardTarget.y)) * 72;
      const dx = targetAnchor.x - sourceAnchor.x;
      const dy = targetAnchor.y - sourceAnchor.y;
      const distance = Math.hypot(dx, dy);
      const score = distance + sourceFacingPenalty + targetFacingPenalty;
      if (score < bestScore) {
        bestScore = score;
        bestPair = {
          sourceHandle,
          targetHandle,
        };
      }
    }
  }

  return bestPair;
}
