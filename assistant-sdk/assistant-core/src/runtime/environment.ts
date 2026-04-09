import {
  installAssistantHostAdapter,
  uninstallAssistantHostAdapter,
  type AssistantHostAdapter,
} from "./hostAdapter";
import {
  installViewRegistryProvider,
  uninstallViewRegistryProvider,
  type ViewRegistryProvider,
} from "./view/registry";

export interface AssistantRuntimeEnvironment {
  hostAdapter?: AssistantHostAdapter | null;
  viewRegistryProvider?: ViewRegistryProvider | null;
}

export function installAssistantRuntimeEnvironment(
  environment?: AssistantRuntimeEnvironment | null
) {
  installAssistantHostAdapter(environment?.hostAdapter || null);
  installViewRegistryProvider(environment?.viewRegistryProvider || null);
}

export function uninstallAssistantRuntimeEnvironment() {
  uninstallAssistantHostAdapter();
  uninstallViewRegistryProvider();
}
