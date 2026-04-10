import {
  installViewRegistryProvider,
  listDefaultCoreViewRegistrations,
  type ViewRegistration,
  type ViewRegistryProvider,
  uninstallViewRegistryProvider,
} from "@dawnchat/assistant-core/view";

import { webAssistantHomeView } from "../views/home/webAssistantHome.view";

const registrations: ViewRegistration[] = [
  webAssistantHomeView,
  ...listDefaultCoreViewRegistrations(),
];

const registrationById = new Map(
  registrations.map((registration) => [registration.view_id, registration] as const)
);

const provider: ViewRegistryProvider = {
  getViewRegistration: (viewId) => registrationById.get(viewId) || null,
  listViewRegistrations: () => [...registrations],
  getViewRouteDefinition: (viewId) => registrationById.get(viewId)?.route || null,
};

let isInstalled = false;

export function installWebAssistantViewRegistry() {
  if (!isInstalled) {
    installViewRegistryProvider(provider);
    isInstalled = true;
  }
  return [...registrations];
}

export function uninstallWebAssistantViewRegistry() {
  if (!isInstalled) {
    return;
  }
  uninstallViewRegistryProvider();
  isInstalled = false;
}

export function getDefaultWebAssistantViewPath() {
  return webAssistantHomeView.route.full_path;
}
