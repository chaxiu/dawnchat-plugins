<script setup lang="ts">
import { ref } from "vue";
import { IonPage } from "@ionic/vue";

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
  <ion-page>
    <!-- No ion-content: its shadow scroll/main layers still composite duplicate "ghost" UI over the
         workspace in plugin preview (Chrome/Safari). Shell fills ion-page with a plain flex host. -->
    <div class="mobile-assistant-shell-root">
      <div class="assistant-shell" :data-mobile-chat-open="isMobileChatOpen">
        <button
          class="chat-backdrop"
          type="button"
          aria-label="Close mobile chat"
          @click="closeMobileChat"
        />

        <aside class="chat-column" :data-open="isMobileChatOpen">
          <div v-if="isMobileChatOpen" class="chat-mobile-handle">
            <div class="chat-mobile-handle__bar">
              <div class="chat-mobile-handle__bar-text">
                <p class="shell-kicker">Assistant</p>
                <strong>Conversation</strong>
              </div>
              <button type="button" class="ghost-button" @click="closeMobileChat">
                Close
              </button>
            </div>
          </div>

          <div class="chat-column__body">
            <AssistantChatPage
              :mobile-sheet-expanded="isMobileChatOpen"
              @expand-mobile-sheet="openMobileChat"
            />
          </div>
        </aside>

        <section class="workspace-column">
          <div class="workspace-body">
            <RouterView />
          </div>
        </section>
      </div>
    </div>
  </ion-page>
</template>

<style scoped>
.mobile-assistant-shell-root {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.assistant-shell {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  gap: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.1), transparent 32%),
    var(--bg-secondary);
}

.shell-kicker {
  margin: 0 0 4px;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.chat-column {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--border);
  background: var(--bg-primary);
  position: relative;
  z-index: 0;
  contain: paint;
}

.chat-column__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-mobile-handle {
  display: none;
}

.workspace-column {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* Opaque paint so the chat column never shows through compositing/backdrop bugs. */
  background: var(--bg-secondary);
  isolation: isolate;
}

.workspace-body {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  isolation: isolate;
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
    max-height: min(80vh, 800px);
    border-right: none;
    border-top: 1px solid var(--border);
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    background: var(--bg-primary);
    box-shadow: 0 -16px 48px rgba(15, 23, 42, 0.12);
    transform: translateY(calc(100% - var(--assistant-chat-dock-peek-height, 120px)));
    transition: transform 180ms ease;
  }

  .assistant-shell[data-mobile-chat-open="true"] .chat-column {
    transform: translateY(0);
  }

  .chat-mobile-handle {
    display: block;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
    background: var(--bg-primary);
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
