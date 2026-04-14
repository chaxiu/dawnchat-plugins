<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  render,
  watch,
} from "vue";
import type { Component } from "vue";

const DEFAULT_THEME_VARS = [
  "--bg-primary",
  "--bg-secondary",
  "--bg-elevated",
  "--border",
  "--text-primary",
  "--text-secondary",
  "--primary",
  "--radius-md",
  "--radius-lg",
  "--radius-xl",
  "--shadow-lg",
];

const BASE_SHADOW_STYLE = `
:host {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  color: var(--text-primary, inherit);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

:host, :host *, :host *::before, :host *::after {
  box-sizing: border-box;
}

:host button,
:host input,
:host select,
:host textarea {
  font: inherit;
}

.assistant-view-host__mount {
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
`;

const props = defineProps<{
  component: Component;
  styleTexts?: string[];
  themeVars?: string[];
  viewId?: string;
}>();

const hostRef = ref<HTMLElement | null>(null);
const currentInstance = getCurrentInstance();
const appContext = currentInstance?.appContext;
const shadowCssText = computed(() => (props.styleTexts || []).join("\n\n"));
const resolvedThemeVars = computed(() =>
  props.themeVars && props.themeVars.length > 0 ? props.themeVars : DEFAULT_THEME_VARS
);

let shadowRoot: ShadowRoot | null = null;
let mountPoint: HTMLDivElement | null = null;
let styleMirrorRoot: HTMLDivElement | null = null;
let baseStyleElement: HTMLStyleElement | null = null;
let viewStyleElement: HTMLStyleElement | null = null;
let themeObserver: MutationObserver | null = null;
let headStyleObserver: MutationObserver | null = null;

function syncThemeVars() {
  const host = hostRef.value;
  if (!host) {
    return;
  }

  const computedStyle = window.getComputedStyle(host);
  for (const variableName of resolvedThemeVars.value) {
    const variableValue = computedStyle.getPropertyValue(variableName).trim();
    if (variableValue) {
      host.style.setProperty(variableName, variableValue);
    } else {
      host.style.removeProperty(variableName);
    }
  }
}

function ensureShadowRoot() {
  const host = hostRef.value;
  if (!host) {
    return;
  }

  shadowRoot = host.shadowRoot || host.attachShadow({ mode: "open" });

  if (!styleMirrorRoot) {
    styleMirrorRoot = document.createElement("div");
    styleMirrorRoot.dataset.role = "assistant-view-host-style-mirror";
    shadowRoot.appendChild(styleMirrorRoot);
  }

  if (!baseStyleElement) {
    baseStyleElement = document.createElement("style");
    baseStyleElement.dataset.role = "assistant-view-host-base";
    baseStyleElement.textContent = BASE_SHADOW_STYLE;
    shadowRoot.appendChild(baseStyleElement);
  }

  if (!viewStyleElement) {
    viewStyleElement = document.createElement("style");
    viewStyleElement.dataset.role = "assistant-view-host-view";
    shadowRoot.appendChild(viewStyleElement);
  }

  if (!mountPoint) {
    mountPoint = document.createElement("div");
    mountPoint.className = "assistant-view-host__mount";
    if (props.viewId) {
      mountPoint.dataset.viewId = props.viewId;
    }
    shadowRoot.appendChild(mountPoint);
  }
}

function cloneStyleNode(node: HTMLStyleElement | HTMLLinkElement) {
  if (node instanceof HTMLStyleElement) {
    const clone = document.createElement("style");
    clone.dataset.sourceRole = "document-style";
    clone.textContent = node.textContent || "";
    return clone;
  }

  const clone = document.createElement("link");
  clone.dataset.sourceRole = "document-style";
  clone.rel = node.rel;
  clone.href = node.href;
  if (node.media) {
    clone.media = node.media;
  }
  if (node.type) {
    clone.type = node.type;
  }
  if (node.crossOrigin) {
    clone.crossOrigin = node.crossOrigin;
  }
  return clone;
}

function syncDocumentStyles() {
  if (!styleMirrorRoot || typeof document === "undefined") {
    return;
  }

  styleMirrorRoot.replaceChildren();
  const styleNodes = document.head.querySelectorAll<HTMLStyleElement | HTMLLinkElement>(
    'style, link[rel="stylesheet"]'
  );
  styleNodes.forEach((node) => {
    styleMirrorRoot?.appendChild(cloneStyleNode(node));
  });
}

function renderIntoShadowRoot() {
  if (!mountPoint) {
    return;
  }

  const vnode = h(props.component);
  if (appContext) {
    vnode.appContext = appContext;
  }
  render(vnode, mountPoint);
}

function updateInjectedStyles() {
  if (!viewStyleElement) {
    return;
  }
  viewStyleElement.textContent = shadowCssText.value;
}

function startThemeObserver() {
  if (typeof document === "undefined") {
    return;
  }

  syncThemeVars();
  themeObserver?.disconnect();
  themeObserver = new MutationObserver(() => {
    syncThemeVars();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style", "data-theme"],
  });
}

function startHeadStyleObserver() {
  if (typeof document === "undefined") {
    return;
  }

  syncDocumentStyles();
  headStyleObserver?.disconnect();
  headStyleObserver = new MutationObserver(() => {
    syncDocumentStyles();
  });
  headStyleObserver.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });
}

onMounted(() => {
  ensureShadowRoot();
  syncDocumentStyles();
  updateInjectedStyles();
  renderIntoShadowRoot();
  startThemeObserver();
  startHeadStyleObserver();
});

watch(shadowCssText, () => {
  updateInjectedStyles();
});

watch(
  () => props.component,
  () => {
    renderIntoShadowRoot();
  }
);

watch(
  () => props.viewId,
  (nextViewId) => {
    if (mountPoint) {
      if (nextViewId) {
        mountPoint.dataset.viewId = nextViewId;
      } else {
        delete mountPoint.dataset.viewId;
      }
    }
  }
);

watch(
  () => props.themeVars,
  () => {
    syncThemeVars();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  themeObserver?.disconnect();
  themeObserver = null;
  headStyleObserver?.disconnect();
  headStyleObserver = null;
  if (mountPoint) {
    render(null, mountPoint);
  }
  mountPoint = null;
  styleMirrorRoot = null;
  viewStyleElement = null;
  baseStyleElement = null;
  shadowRoot = null;
});
</script>

<template>
  <div ref="hostRef" class="assistant-view-host" :data-view-id="viewId || undefined" />
</template>

<style scoped>
.assistant-view-host {
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  display: block;
}
</style>
