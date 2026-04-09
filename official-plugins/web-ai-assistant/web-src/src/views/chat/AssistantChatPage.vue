<script setup lang="ts">
import { computed } from "vue";

import { useAssistantChat } from "../../features/chat/useAssistantChat";
import { useProviderConfig } from "../../features/provider/useProviderConfig";

const {
  draftConfig,
  savedConfig,
  isConfigured,
  statusMessage,
  updateProvider,
  saveDraft,
  resetDraft,
  clearProviderConfig,
} = useProviderConfig();
const {
  prompt,
  transcript,
  isRunning,
  errorMessage,
  lastStopReason,
  hasTranscript,
  submitPrompt,
  clearConversation,
} = useAssistantChat();

const maskedApiKey = computed(() => {
  const apiKey = savedConfig.value.apiKey.trim();
  if (!apiKey) {
    return "Not configured";
  }
  if (apiKey.length <= 8) {
    return `${apiKey.slice(0, 2)}***`;
  }
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
});

function formatContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  return JSON.stringify(content, null, 2);
}

async function handleSubmit() {
  await submitPrompt(savedConfig.value);
}
</script>

<template>
  <section class="chat-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">DawnChat Web AI Assistant</p>
        <h1>Chat + tool-calling MVP</h1>
        <p class="summary">
          Configure OpenAI or Gemini, save the provider locally, then run a minimal
          agent loop with one local tool and one host-context tool.
        </p>
      </div>
      <div class="saved-pill">
        <span>{{ savedConfig.provider }}</span>
        <span>{{ savedConfig.modelId }}</span>
        <span>{{ maskedApiKey }}</span>
      </div>
    </section>

    <section class="content-grid">
      <article class="panel-card">
        <header class="panel-header">
          <div>
            <h2>Provider settings</h2>
            <p>Stored locally in this template for MVP validation only.</p>
          </div>
          <span class="status-chip" :data-ready="isConfigured">
            {{ isConfigured ? "Ready" : "Missing API key or model" }}
          </span>
        </header>

        <div class="form-grid">
          <label class="field">
            <span>Provider</span>
            <select
              :value="draftConfig.provider"
              @change="updateProvider(($event.target as HTMLSelectElement).value as 'openai' | 'gemini')"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>

          <label class="field">
            <span>Model ID</span>
            <input v-model="draftConfig.modelId" type="text" placeholder="gpt-4.1-mini or gemini-2.5-flash" />
          </label>

          <label class="field field--full">
            <span>API key</span>
            <input v-model="draftConfig.apiKey" type="password" placeholder="Paste your provider API key" />
          </label>

          <label v-if="draftConfig.provider === 'openai'" class="field field--full">
            <span>Base URL (optional)</span>
            <input v-model="draftConfig.baseURL" type="text" placeholder="https://api.openai.com/v1" />
          </label>
        </div>

        <div class="action-row">
          <button type="button" @click="saveDraft">Save locally</button>
          <button type="button" class="ghost" @click="resetDraft">Reset draft</button>
          <button type="button" class="ghost danger" @click="clearProviderConfig">Clear saved config</button>
        </div>

        <p v-if="statusMessage" class="status-message">{{ statusMessage }}</p>
      </article>

      <article class="panel-card panel-card--chat">
        <header class="panel-header">
          <div>
            <h2>Assistant chat</h2>
            <p>Ask for arithmetic or host information to exercise tools.</p>
          </div>
          <div class="chat-meta">
            <span>Stop: {{ lastStopReason || "n/a" }}</span>
            <button type="button" class="ghost" @click="clearConversation">Clear chat</button>
          </div>
        </header>

        <div class="transcript">
          <template v-if="hasTranscript">
            <article
              v-for="(message, index) in transcript"
              :key="`${message.role}-${index}`"
              class="message-card"
              :data-role="message.role"
            >
              <header class="message-header">
                <strong>{{ message.role }}</strong>
                <span v-if="'name' in message && message.name">{{ message.name }}</span>
              </header>

              <pre class="message-content">{{ formatContent(message.content) }}</pre>

              <ul
                v-if="message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0"
                class="tool-call-list"
              >
                <li v-for="toolCall in message.toolCalls" :key="toolCall.id">
                  {{ toolCall.name }}: {{ formatContent(toolCall.input) }}
                </li>
              </ul>
            </article>
          </template>

          <div v-else class="empty-state">
            <p>Try one of these prompts:</p>
            <ul>
              <li><code>Use math.add to compute 18 + 24.</code></li>
              <li><code>Use dawnchat.host_info to inspect this host.</code></li>
            </ul>
          </div>
        </div>

        <form class="composer" @submit.prevent="handleSubmit">
          <textarea
            v-model="prompt"
            rows="4"
            placeholder="Ask the assistant to call a tool or answer directly."
          />
          <div class="action-row">
            <button type="submit" :disabled="isRunning">
              {{ isRunning ? "Running..." : "Run agent loop" }}
            </button>
          </div>
        </form>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      </article>
    </section>
  </section>
</template>

<style scoped>
.chat-page {
  flex: 1 1 100%;
  min-height: 0;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-card,
.panel-card {
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.76);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
}

.hero-card {
  padding: 28px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.eyebrow {
  margin: 0 0 12px;
  color: #93c5fd;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
}

h1 {
  font-size: clamp(2rem, 4vw, 3.2rem);
}

.summary,
.panel-header p,
.empty-state {
  color: rgba(226, 232, 240, 0.84);
  line-height: 1.7;
}

.saved-pill,
.chat-meta,
.action-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.saved-pill span,
.chat-meta span,
.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  font-size: 0.88rem;
}

.status-chip[data-ready="true"] {
  background: rgba(34, 197, 94, 0.18);
  color: #bbf7d0;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 20px;
  flex: 1 1 100%;
  min-height: 0;
}

.panel-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-card--chat {
  min-height: 560px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field--full {
  grid-column: 1 / -1;
}

input,
select,
textarea,
button {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.48);
  color: inherit;
}

input,
select,
textarea {
  padding: 12px 14px;
}

textarea {
  resize: vertical;
  min-height: 96px;
}

button {
  padding: 11px 16px;
  cursor: pointer;
}

button.ghost {
  background: rgba(148, 163, 184, 0.12);
}

button.danger {
  color: #fecaca;
}

.status-message,
.error-message {
  margin: 14px 0 0;
}

.status-message {
  color: #bfdbfe;
}

.error-message {
  color: #fecaca;
}

.transcript {
  margin-top: 18px;
  flex: 1 1 100%;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.message-card {
  padding: 16px;
  border-radius: 18px;
  background: rgba(8, 15, 26, 0.76);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.message-card[data-role="assistant"] {
  border-color: rgba(96, 165, 250, 0.22);
}

.message-card[data-role="tool"] {
  border-color: rgba(74, 222, 128, 0.22);
}

.message-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 0.92rem;
  color: #cbd5e1;
}

.message-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.tool-call-list {
  margin: 12px 0 0;
  padding-left: 20px;
  color: rgba(191, 219, 254, 0.88);
}

.composer {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state ul {
  margin: 12px 0 0;
  padding-left: 18px;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .hero-card,
  .panel-header {
    flex-direction: column;
  }
}
</style>
