import {
  getDefaultCoreViewRegistration,
  getDefaultCoreViewRouteDefinition,
  listDefaultCoreViewRegistrations,
  type ViewRegistryProvider,
  type ViewRegistration,
  type ViewRouteDefinition,
} from "@dawnchat/assistant-core/runtime/view/index";
import { musicMainView } from "../../views/pages/music/musicMain.view";
import { wordMainView } from "../../views/pages/word/wordMain.view";

const desktopOnlyRegistry: Record<string, ViewRegistration> = {
  [musicMainView.view_id]: musicMainView,
  [wordMainView.view_id]: wordMainView,
};

export function getViewRegistration(viewId: string): ViewRegistration | null {
  return desktopOnlyRegistry[viewId] || getDefaultCoreViewRegistration(viewId);
}

export function listViewRegistrations(): ViewRegistration[] {
  return [
    ...listDefaultCoreViewRegistrations(),
    ...Object.values(desktopOnlyRegistry),
  ];
}

export function getViewRouteDefinition(viewId: string): ViewRouteDefinition | null {
  const registration = desktopOnlyRegistry[viewId];
  return registration?.route || getDefaultCoreViewRouteDefinition(viewId);
}

export function createDesktopViewRegistryProvider(): ViewRegistryProvider {
  return {
    getViewRegistration,
    listViewRegistrations,
    getViewRouteDefinition,
  };
}
