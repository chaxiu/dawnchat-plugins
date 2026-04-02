import { articleMainViewRegistration } from "../../views/pages/article/articleMainViewRegistration";
import { wordMainViewRegistration } from "../../views/pages/word/wordMainViewRegistration";
import type { ViewRegistration, ViewRouteDefinition } from "./manifest";

const viewRegistry: Record<string, ViewRegistration> = {
  [articleMainViewRegistration.manifest.view_id]: articleMainViewRegistration,
  [wordMainViewRegistration.manifest.view_id]: wordMainViewRegistration,
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
