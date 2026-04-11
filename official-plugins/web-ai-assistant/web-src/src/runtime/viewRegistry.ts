import {
  installViewRegistryProvider,
  listDefaultCoreViewRegistrations,
  type ViewRegistration,
  type ViewRegistryProvider,
  uninstallViewRegistryProvider,
} from "@dawnchat/assistant-core/view";

const registrations: ViewRegistration[] = [...listDefaultCoreViewRegistrations()];

const registrationById = new Map(
  registrations.map((registration) => [registration.view_id, registration] as const)
);

/** 供 compose 传入 runtime environment，避免只传 hostAdapter 时把 registry 置空。 */
export const webAssistantViewRegistryProvider: ViewRegistryProvider = {
  getViewRegistration: (viewId) => registrationById.get(viewId) || null,
  listViewRegistrations: () => [...registrations],
  getViewRouteDefinition: (viewId) => registrationById.get(viewId)?.route || null,
};

let isInstalled = false;

export function installWebAssistantViewRegistry() {
  if (!isInstalled) {
    installViewRegistryProvider(webAssistantViewRegistryProvider);
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

