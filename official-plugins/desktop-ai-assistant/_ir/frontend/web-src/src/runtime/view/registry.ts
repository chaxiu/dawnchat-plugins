import { boardMainView } from "../../views/pages/board/boardMain.view";
import { imageExplainerMainView } from "../../views/pages/image-explainer/imageExplainerMain.view";
import { musicMainView } from "../../views/pages/music/musicMain.view";
import { tictactoeMainView } from "../../views/pages/tictactoe/tictactoeMain.view";
import { wordMainView } from "../../views/pages/word/wordMain.view";
import type { ViewRegistration, ViewRouteDefinition } from "./manifest";

const viewRegistry: Record<string, ViewRegistration> = {
  [boardMainView.view_id]: boardMainView,
  [imageExplainerMainView.view_id]: imageExplainerMainView,
  [musicMainView.view_id]: musicMainView,
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
