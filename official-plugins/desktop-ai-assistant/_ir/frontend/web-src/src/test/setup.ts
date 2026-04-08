import "fake-indexeddb/auto";
import {
  installAssistantRuntimeEnvironment,
  uninstallAssistantRuntimeEnvironment,
} from "@dawnchat/assistant-core";
import { createDesktopHostVoiceAdapter } from "../runtime/hostVoiceBridge";
import { createDesktopViewRegistryProvider } from "../runtime/view/registry";

function installDesktopTestRuntimeEnvironment() {
  installAssistantRuntimeEnvironment({
    hostAdapter: {
      postRuntimeEventToHost: () => true,
      voice: createDesktopHostVoiceAdapter(),
    },
    viewRegistryProvider: createDesktopViewRegistryProvider(),
  });
}

if (typeof window !== "undefined") {
  Object.assign(window, {
    indexedDB: globalThis.indexedDB,
    IDBKeyRange: globalThis.IDBKeyRange,
  });
}

installDesktopTestRuntimeEnvironment();

beforeEach(() => {
  installDesktopTestRuntimeEnvironment();
});

afterEach(() => {
  uninstallAssistantRuntimeEnvironment();
});
