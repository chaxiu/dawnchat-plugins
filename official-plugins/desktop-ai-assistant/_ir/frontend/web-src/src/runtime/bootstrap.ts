import { router } from "../router";
import { registerCapabilities, unregisterCapabilities } from "./capabilities";
import { useGuideState } from "./guideState";
import { createSessionStepCapabilityRegistrations } from "./sessionStepExecutor";
import { createViewDescribeCapabilityRegistration } from "./viewRuntime";
import { getViewRegistration } from "./viewRegistry";
import { useViewState } from "./viewState";

function createViewNavigator() {
  return async (viewId: string) => {
    const registration = getViewRegistration(viewId);
    if (!registration) {
      return;
    }
    await router.push(registration.manifest.route_path);
  };
}

export function installAssistantRuntimeCapabilities(): string[] {
  const { setCurrentCard, setActiveTip, setNarrationState, getGuideStateSnapshot } = useGuideState();
  const { setActiveViewState, getViewStateSnapshot } = useViewState();
  const navigateToView = createViewNavigator();
  const registrations = [
    ...createSessionStepCapabilityRegistrations({
      setCurrentCard,
      setActiveTip,
      setNarrationState,
      setActiveViewState,
      getViewStateSnapshot,
      navigateToView,
    }),
    createViewDescribeCapabilityRegistration({
      setActiveViewState,
      getViewStateSnapshot,
      getGuideStateSnapshot,
      navigateToView,
    }),
  ];
  return registerCapabilities(registrations).registered;
}

export function uninstallAssistantRuntimeCapabilities(names: string[]) {
  unregisterCapabilities(names);
}
