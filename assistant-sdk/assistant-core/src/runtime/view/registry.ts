import { boardMainView } from "../../views/pages/board/boardMain.view";
import { coordinatePlaneMainView } from "../../views/pages/coordinate-plane/coordinatePlaneMain.view";
import { imageExplainerMainView } from "../../views/pages/image-explainer/imageExplainerMain.view";
import { taskMainView } from "../../views/pages/task/taskMain.view";
import { tictactoeMainView } from "../../views/pages/tictactoe/tictactoeMain.view";
import type { ViewRegistration, ViewRouteDefinition } from "./manifest";

export interface ViewRegistryProvider {
  getViewRegistration: (viewId: string) => ViewRegistration | null;
  listViewRegistrations: () => ViewRegistration[];
  getViewRouteDefinition: (viewId: string) => ViewRouteDefinition | null;
}

const viewRegistry: Record<string, ViewRegistration> = {
  [boardMainView.view_id]: boardMainView,
  [coordinatePlaneMainView.view_id]: coordinatePlaneMainView,
  [imageExplainerMainView.view_id]: imageExplainerMainView,
  [taskMainView.view_id]: taskMainView,
  [tictactoeMainView.view_id]: tictactoeMainView,
};

let registryProvider: ViewRegistryProvider | null = null;

export function installViewRegistryProvider(provider: ViewRegistryProvider | null) {
  registryProvider = provider || null;
}

export function uninstallViewRegistryProvider() {
  registryProvider = null;
}

export function getDefaultCoreViewRegistration(viewId: string): ViewRegistration | null {
  return viewRegistry[viewId] || null;
}

export function listDefaultCoreViewRegistrations(): ViewRegistration[] {
  return Object.values(viewRegistry);
}

export function getDefaultCoreViewRouteDefinition(viewId: string): ViewRouteDefinition | null {
  const registration = getDefaultCoreViewRegistration(viewId);
  return registration ? registration.route : null;
}

export function getViewRegistration(viewId: string): ViewRegistration | null {
  if (registryProvider) {
    return registryProvider.getViewRegistration(viewId);
  }
  return getDefaultCoreViewRegistration(viewId);
}

export function listViewRegistrations(): ViewRegistration[] {
  if (registryProvider) {
    return registryProvider.listViewRegistrations();
  }
  return listDefaultCoreViewRegistrations();
}

export function getViewRouteDefinition(viewId: string): ViewRouteDefinition | null {
  if (registryProvider) {
    return registryProvider.getViewRouteDefinition(viewId);
  }
  return getDefaultCoreViewRouteDefinition(viewId);
}
