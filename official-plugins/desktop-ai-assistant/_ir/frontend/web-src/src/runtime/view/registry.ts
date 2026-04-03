import { tictactoeMainView } from "../../views/pages/tictactoe/tictactoeMain.view";
import { wordMainView } from "../../views/pages/word/wordMain.view";
import type { ViewRegistration, ViewRouteDefinition } from "./manifest";

const viewRegistry: Record<string, ViewRegistration> = {
  [tictactoeMainView.view_id]: tictactoeMainView,
  [wordMainView.view_id]: wordMainView,
};

export function getViewRegistration(viewId: string): ViewRegistration | null {
  return viewRegistry[viewId] || null;
}

export function listViewRegistrations(): ViewRegistration[] {
  return Object.values(viewRegistry);
}

export function getViewRouteDefinition(viewId: string): ViewRouteDefinition | null {
  const registration = getViewRegistration(viewId);
  return registration ? registration.route : null;
}
