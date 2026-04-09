import type { ViewCapabilityResult, ViewResourceBinding } from "../../../../runtime/view";
import { buildOperationError } from "../../../shared/viewUtils";
import {
  addBoardEdge,
  addBoardNode,
  arrangeBoardLayout,
  focusBoardNode,
  pinBoardNode,
  removeBoardEdge,
  removeBoardNode,
  updateBoardNode,
} from "./mutations";

export async function invokeBoardMainCapability(
  capabilityId: string,
  input: Record<string, unknown>,
  resource: ViewResourceBinding
): Promise<ViewCapabilityResult> {
  if (capabilityId === "board.add_node") {
    return addBoardNode(resource, input);
  }
  if (capabilityId === "board.update_node") {
    return updateBoardNode(resource, input);
  }
  if (capabilityId === "board.remove_node") {
    return removeBoardNode(resource, input);
  }
  if (capabilityId === "board.add_edge") {
    return addBoardEdge(resource, input);
  }
  if (capabilityId === "board.remove_edge") {
    return removeBoardEdge(resource, input);
  }
  if (capabilityId === "board.arrange_layout") {
    return arrangeBoardLayout(resource);
  }
  if (capabilityId === "board.pin_node") {
    return pinBoardNode(resource, input, true);
  }
  if (capabilityId === "board.unpin_node") {
    return pinBoardNode(resource, input, false);
  }
  if (capabilityId === "board.focus_node") {
    return focusBoardNode(resource, input);
  }

  return buildOperationError(
    "view_capability_not_found",
    `View capability not found: ${capabilityId}`
  );
}
