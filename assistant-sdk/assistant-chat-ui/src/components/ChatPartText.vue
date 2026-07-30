<template>
  <div class="part-text markdown-body" v-html="renderedHtml" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";

const props = defineProps<{ text?: string }>();

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const renderedHtml = computed(() => {
  const source = String(props.text || "");
  const html = markdown.render(source);
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
});
</script>

<style scoped>
.part-text {
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
  overflow-x: auto;
  overflow-wrap: break-word;
}

.part-text :deep(p) {
  margin: 0.2rem 0 0.35rem 0;
}

.part-text :deep(h1),
.part-text :deep(h2),
.part-text :deep(h3) {
  margin: 0.65rem 0 0.3rem 0;
  font-weight: 650;
  line-height: 1.3;
  color: var(--color-text);
}

.part-text :deep(h1) {
  font-size: 1.2rem;
}

.part-text :deep(h2) {
  font-size: 1.08rem;
}

.part-text :deep(h3) {
  font-size: 0.98rem;
}

.part-text :deep(ul),
.part-text :deep(ol) {
  margin: 0.25rem 0 0.45rem 0;
  padding-left: 1.35rem;
  list-style-position: outside;
}

.part-text :deep(ul) {
  list-style-type: disc;
}

.part-text :deep(ol) {
  list-style-type: decimal;
}

.part-text :deep(ul ul) {
  list-style-type: circle;
  margin: 0.15rem 0;
  padding-left: 1.2rem;
}

.part-text :deep(ol ol) {
  list-style-type: lower-alpha;
  margin: 0.15rem 0;
  padding-left: 1.2rem;
}

.part-text :deep(li + li) {
  margin-top: 0.18rem;
}

.part-text :deep(li > p) {
  margin: 0.1rem 0;
}

.part-text :deep(blockquote) {
  margin: 0.4rem 0;
  padding: 0.15rem 0 0.15rem 0.7rem;
  border-left: 3px solid color-mix(in srgb, var(--color-border) 80%, var(--color-primary));
  color: var(--color-text-secondary);
}

.part-text :deep(hr) {
  margin: 0.65rem 0;
  border: 0;
  border-top: 1px solid var(--color-border);
}

.part-text :deep(table) {
  width: 100%;
  min-width: 28rem;
  margin: 0.4rem 0;
  border-collapse: collapse;
  font-size: 0.82rem;
  line-height: 1.4;
}

.part-text :deep(th),
.part-text :deep(td) {
  border: 1px solid var(--color-border);
  padding: 0.35rem 0.6rem;
  text-align: left;
  vertical-align: top;
  word-break: normal;
  overflow-wrap: break-word;
}

.part-text :deep(th) {
  font-weight: 600;
  background: var(--color-surface-2);
  color: var(--color-text);
}

.part-text :deep(pre) {
  margin: 0.35rem 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-2);
  padding: 0.5rem 0.6rem;
  overflow: auto;
}

.part-text :deep(code) {
  font-size: 0.84em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
  overflow-wrap: anywhere;
}

.part-text :deep(:not(pre) > code) {
  padding: 0.08rem 0.28rem;
  border-radius: 4px;
  background: color-mix(in srgb, var(--color-surface-3) 85%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
}

.part-text :deep(pre code) {
  white-space: pre;
  padding: 0;
  border: 0;
  background: transparent;
  overflow-wrap: normal;
}

.part-text :deep(a) {
  color: var(--color-primary);
  text-decoration: underline;
  overflow-wrap: anywhere;
}
</style>
