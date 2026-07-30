<template>
  <div class="msg-item-row assistant file-edit-row">
    <span class="msg-role">{{ agentLabel }}</span>
    <div class="file-edit-card" :data-status="fileEdit.status || 'pending'">
      <div
        v-for="(file, index) in fileEdit.files"
        :key="`${file.path}-${index}`"
        class="file-edit-section"
      >
        <div class="file-edit-header">
          <button
            type="button"
            class="file-edit-name"
            :title="file.path"
            @click.stop="emit('file-open', file.path)"
          >
            {{ file.displayName }}
          </button>
          <span class="file-edit-stats" aria-hidden="true">
            <span v-if="file.additions > 0" class="file-edit-stat file-edit-stat--add"
              >+{{ file.additions }}</span
            >
            <span v-if="file.deletions > 0" class="file-edit-stat file-edit-stat--del"
              >-{{ file.deletions }}</span
            >
          </span>
        </div>

        <!-- Collapsed / expanded are separate nodes so overflow cannot leak. -->
        <div
          v-if="!expanded"
          class="file-edit-body file-edit-body--collapsed"
          :data-preview-mode="file.previewMode"
        >
          <slot name="body" :file="file" :expanded="false">
            <pre
              v-if="file.previewMode === 'content'"
              class="file-edit-content"
            ><code>{{ file.contentPreview || "" }}</code></pre>
            <div v-else class="file-edit-diff" role="region" aria-label="Diff">
              <div
                v-for="(line, lineIndex) in diffLinesFor(file.unifiedDiff)"
                :key="lineIndex"
                class="file-edit-diff-line"
                :class="`file-edit-diff-line--${line.kind}`"
              >
                <code>{{ line.displayText || " " }}</code>
              </div>
              <div v-if="!file.unifiedDiff.trim()" class="file-edit-diff-empty">
                {{ emptyDiffHint }}
              </div>
            </div>
          </slot>
        </div>
        <div
          v-else
          class="file-edit-body file-edit-body--expanded"
          :data-preview-mode="file.previewMode"
        >
          <slot name="body" :file="file" :expanded="true">
            <pre
              v-if="file.previewMode === 'content'"
              class="file-edit-content"
            ><code>{{ file.contentPreview || "" }}</code></pre>
            <div v-else class="file-edit-diff" role="region" aria-label="Diff">
              <div
                v-for="(line, lineIndex) in diffLinesFor(file.unifiedDiff)"
                :key="lineIndex"
                class="file-edit-diff-line"
                :class="`file-edit-diff-line--${line.kind}`"
              >
                <code>{{ line.displayText || " " }}</code>
              </div>
              <div v-if="!file.unifiedDiff.trim()" class="file-edit-diff-empty">
                {{ emptyDiffHint }}
              </div>
            </div>
          </slot>
        </div>
      </div>

      <button type="button" class="file-edit-toggle" @click="expanded = !expanded">
        {{ expanded ? collapseLabel : expandLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import type { ChatFileEditInfo } from "../types";

type DiffLineKind = "add" | "del" | "hunk" | "meta" | "context" | "empty";

type DiffLine = {
  kind: DiffLineKind;
  text: string;
  displayText: string;
};

withDefaults(
  defineProps<{
    fileEdit: ChatFileEditInfo;
    agentLabel?: string;
    expandLabel?: string;
    collapseLabel?: string;
    emptyDiffHint?: string;
  }>(),
  {
    agentLabel: "Assistant",
    expandLabel: "Expand",
    collapseLabel: "Collapse",
    emptyDiffHint: "No diff yet",
  },
);

const emit = defineEmits<{
  "file-open": [path: string];
}>();

const expanded = ref(false);

function classifyDiffLine(line: string): DiffLineKind {
  if (line.length === 0) return "empty";
  if (
    line.startsWith("Index:") ||
    line.startsWith("+++") ||
    line.startsWith("---") ||
    line.startsWith("diff ") ||
    line.startsWith("index ") ||
    /^=+$/.test(line.trim())
  ) {
    return "meta";
  }
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "del";
  return "context";
}

function displayTextFor(kind: DiffLineKind, text: string): string {
  if (kind === "add" || kind === "del" || kind === "context") {
    return text.length > 0 ? text.slice(1) : "";
  }
  return text;
}

function diffLinesFor(source: string): DiffLine[] {
  if (!source) return [];
  const rawLines = source.replace(/\r\n/g, "\n").split("\n");
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") {
    rawLines.pop();
  }
  return rawLines.map((text: string) => {
    const kind = classifyDiffLine(text);
    return {
      kind,
      text,
      displayText: displayTextFor(kind, text),
    };
  });
}
</script>

<!--
  Unscoped on purpose: this package ships extracted CSS separately from JS.
  Scoped data-v hashes desync across rebuild/cache and silently strip all card chrome.
  Class names are already file-edit-* prefixed.
-->
<style>
.file-edit-row.msg-item-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 100%;
}

.file-edit-row.msg-item-row.assistant {
  align-items: stretch;
}

.file-edit-row > .msg-role {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding: 0 0.1rem;
}

/* Outer shell only. Body is flush: no inset frame, no nested radius. */
.file-edit-card {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  overflow: hidden;
  padding: 0;
}

.file-edit-section + .file-edit-section {
  border-top: 1px solid var(--color-border);
}

.file-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.7rem;
}

.file-edit-name {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  color: color-mix(in srgb, var(--color-primary) 85%, var(--color-text));
  cursor: pointer;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.file-edit-name:hover {
  color: var(--color-primary);
}

.file-edit-stats {
  display: inline-flex;
  gap: 0.35rem;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.file-edit-stat--add {
  color: #2f855a;
}

.file-edit-stat--del {
  color: #d9534f;
}

.file-edit-body {
  border-top: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
  background: transparent;
  border-radius: 0;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
  padding: 0;
  margin: 0;
}

/* Fixed short preview — always visually shorter than expanded. */
.file-edit-body--collapsed {
  height: 3.25rem;
  max-height: 3.25rem;
  overflow: hidden;
}

/* Grow with content up to cap; scroll only when needed. */
.file-edit-body--expanded {
  height: auto;
  max-height: 22rem;
  overflow-x: hidden;
  overflow-y: auto;
}

/* Host slotted preview must never become a second frame or scrollport. */
.file-edit-body .ma-file-edit-diff-host,
.file-edit-body .ma-file-edit-code-host,
.file-edit-body .ma-unified-diff,
.file-edit-body .ma-file-edit-code {
  background: transparent !important;
  border-radius: 0 !important;
  border: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  flex: none !important;
  min-height: 0 !important;
  overflow: visible !important;
}

.file-edit-body .ma-diff-line,
.file-edit-body .ma-file-edit-code-line {
  padding: 0 !important;
  border-radius: 0 !important;
  white-space: pre !important;
  word-break: normal !important;
  overflow: hidden !important;
}

.file-edit-body .ma-diff-line code,
.file-edit-body .ma-file-edit-code-line code {
  padding: 0 !important;
}

.file-edit-body .ma-diff-line--meta,
.file-edit-body .ma-diff-line--hunk {
  display: none !important;
}

.file-edit-content,
.file-edit-diff {
  margin: 0;
  padding: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
  font-size: 0.72rem;
  line-height: 1.45;
}

.file-edit-content {
  white-space: pre;
  word-break: normal;
  overflow: hidden;
}

.file-edit-content code {
  font: inherit;
  background: transparent;
  padding: 0;
  color: inherit;
}

.file-edit-diff-line {
  display: block;
  padding: 0;
  white-space: pre;
  word-break: normal;
  overflow: hidden;
}

.file-edit-diff-line code {
  font: inherit;
  background: transparent;
  padding: 0;
  color: inherit;
}

.file-edit-diff-line--add {
  background: color-mix(in srgb, #22c55e 18%, transparent);
}

.file-edit-diff-line--del {
  background: color-mix(in srgb, #ef4444 18%, transparent);
}

.file-edit-diff-line--hunk,
.file-edit-diff-line--meta {
  display: none;
}

.file-edit-diff-empty {
  padding: 0.45rem 0.7rem;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.file-edit-toggle {
  display: block;
  width: 100%;
  border: 0;
  border-top: 1px solid var(--color-border);
  background: transparent;
  padding: 0.28rem 0.7rem;
  font: inherit;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  text-align: center;
}

.file-edit-toggle:hover {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-surface-3) 40%, transparent);
}
</style>
