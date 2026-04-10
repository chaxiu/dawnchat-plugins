<script setup lang="ts">
import { ref } from "vue";

import AssistantChatPage from "../views/chat/AssistantChatPage.vue";

const isMobileChatOpen = ref(false);

function openMobileChat() {
  isMobileChatOpen.value = true;
}

function closeMobileChat() {
  isMobileChatOpen.value = false;
}
</script>

<template>
  <div class="assistant-shell" :data-mobile-chat-open="isMobileChatOpen">
    <button
      class="chat-backdrop"
      type="button"
      aria-label="Close mobile chat"
      @click="closeMobileChat"
    />

    <aside class="chat-column" :data-open="isMobileChatOpen">
      <div class="chat-column__body">
        <AssistantChatPage />
      </div>

      <!-- 折叠时露在屏幕底部的是 aside 的「最后」一段：把手必须放在 DOM 末尾，点击即可展开 -->
      <div class="chat-mobile-sheet-edge" aria-hidden="true">
        <span class="chat-mobile-sheet-edge__pill" />
      </div>

      <div class="chat-mobile-handle">
        <template v-if="!isMobileChatOpen">
          <button
            type="button"
            class="chat-mobile-handle__expand"
            aria-label="展开聊天面板"
            @click="openMobileChat"
          >
            <span class="chat-mobile-handle__title">Chat</span>
            <span class="chat-mobile-handle__hint">点按展开</span>
          </button>
        </template>
        <template v-else>
          <div class="chat-mobile-handle__bar">
            <div class="chat-mobile-handle__bar-text">
              <p class="shell-kicker">Assistant</p>
              <strong>Conversation</strong>
            </div>
            <button type="button" class="ghost-button" @click="closeMobileChat">
              Close
            </button>
          </div>
        </template>
      </div>
    </aside>

    <section class="workspace-column">
      <div class="workspace-body">
        <RouterView />
      </div>
    </section>
  </div>
</template>

<style scoped>
.assistant-shell {
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  gap: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.1), transparent 32%),
    var(--bg-secondary);
}

.chat-column {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--border);
  background: var(--bg-primary);
}

.chat-column__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-mobile-sheet-edge,
.chat-mobile-handle {
  display: none;
}

.workspace-column {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

.workspace-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.ghost-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.chat-backdrop {
  display: none;
}

@media (max-width: 960px) {
  .assistant-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .chat-column {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    max-height: min(78vh, 720px);
    border-right: none;
    border-top: 1px solid var(--border);
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    background: var(--bg-primary);
    box-shadow: 0 -16px 48px rgba(15, 23, 42, 0.12);
    transform: translateY(calc(100% - 72px));
    transition: transform 180ms ease;
  }

  .assistant-shell[data-mobile-chat-open="true"] .chat-column {
    transform: translateY(0);
  }

  /* 折叠：底部露出的条 = 把手（order 最大，排在 DOM 最后） */
  .chat-mobile-sheet-edge {
    display: flex;
    justify-content: center;
    padding: 8px 0 4px;
    flex-shrink: 0;
    order: 2;
  }

  .chat-mobile-sheet-edge__pill {
    width: 40px;
    height: 5px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-muted) 45%, var(--border));
  }

  .chat-mobile-handle {
    display: block;
    flex-shrink: 0;
    order: 3;
    border-top: 1px solid var(--border);
    background: var(--bg-primary);
  }

  .chat-column__body {
    order: 1;
    min-height: 0;
  }

  /* 展开：把手条移到顶部，便于关闭 */
  .assistant-shell[data-mobile-chat-open="true"] .chat-column__body {
    order: 2;
  }

  .assistant-shell[data-mobile-chat-open="true"] .chat-mobile-sheet-edge {
    display: none;
  }

  .assistant-shell[data-mobile-chat-open="true"] .chat-mobile-handle {
    order: 0;
    border-top: none;
    border-bottom: 1px solid var(--border);
  }

  .chat-mobile-handle__expand {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px 14px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--text-primary);
    text-align: left;
  }

  .chat-mobile-handle__title {
    font-weight: 700;
    font-size: 1rem;
  }

  .chat-mobile-handle__hint {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .chat-mobile-handle__bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
  }

  .chat-mobile-handle__bar-text {
    min-width: 0;
  }

  .workspace-body {
    padding: 0;
  }

  .chat-backdrop {
    position: fixed;
    inset: 0;
    z-index: 18;
    border: none;
    background: rgba(15, 23, 42, 0.22);
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease;
  }

  .assistant-shell[data-mobile-chat-open="true"] .chat-backdrop {
    display: block;
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
