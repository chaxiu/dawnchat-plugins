import type { ViewCapabilityResult, ViewStateBinding } from "../../../../runtime/view";
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
  state_binding: ViewStateBinding
): Promise<ViewCapabilityResult> {
  if (capabilityId === "board.add_node") {
    return addBoardNode(state_binding, input);
  }
  if (capabilityId === "board.update_node") {
    return updateBoardNode(state_binding, input);
  }
  if (capabilityId === "board.remove_node") {
    return removeBoardNode(state_binding, input);
  }
  if (capabilityId === "board.add_edge") {
    return addBoardEdge(state_binding, input);
  }
  if (capabilityId === "board.remove_edge") {
    return removeBoardEdge(state_binding, input);
  }
  if (capabilityId === "board.arrange_layout") {
    return arrangeBoardLayout(state_binding);
  }
  if (capabilityId === "board.pin_node") {
    return pinBoardNode(state_binding, input, true);
  }
  if (capabilityId === "board.unpin_node") {
    return pinBoardNode(state_binding, input, false);
  }
  if (capabilityId === "board.focus_node") {
    return focusBoardNode(state_binding, input);
  }

  return buildOperationError(
    "view_capability_not_found",
    `View capability not found: ${capabilityId}`
  );
}
