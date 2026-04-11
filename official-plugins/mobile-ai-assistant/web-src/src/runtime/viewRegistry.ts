import {
  installViewRegistryProvider,
  listDefaultCoreViewRegistrations,
  type ViewRegistration,
  type ViewRegistryProvider,
  uninstallViewRegistryProvider,
} from "@dawnchat/assistant-core/view";

import { mobileAssistantHomeView } from "../views/home/mobileAssistantHome.view";

const registrations: ViewRegistration[] = [
  mobileAssistantHomeView,
  ...listDefaultCoreViewRegistrations(),
];

const registrationById = new Map(
  registrations.map((registration) => [registration.view_id, registration] as const)
);

/** 供 compose 传入 runtime environment，避免只传 hostAdapter 时把 registry 置空。 */
export const mobileAssistantViewRegistryProvider: ViewRegistryProvider = {
  getViewRegistration: (viewId) => registrationById.get(viewId) || null,
  listViewRegistrations: () => [...registrations],
  getViewRouteDefinition: (viewId) => registrationById.get(viewId)?.route || null,
};

let isInstalled = false;

export function installMobileAssistantViewRegistry() {
  if (!isInstalled) {
    installViewRegistryProvider(mobileAssistantViewRegistryProvider);
    isInstalled = true;
  }
  return [...registrations];
}

export function uninstallMobileAssistantViewRegistry() {
  if (!isInstalled) {
    return;
  }
  uninstallViewRegistryProvider();
  isInstalled = false;
}

export function getDefaultMobileAssistantViewPath() {
  return mobileAssistantHomeView.route.full_path;
}
