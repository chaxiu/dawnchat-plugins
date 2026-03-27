<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

// @iwp.link views/pages/home.md::n.48a9
const nameInput = ref("DawnChat");
const backendStatus = ref<"idle" | "loading" | "success" | "error">("idle");
const backendGreeting = ref("");
const backendError = ref("");

const greetingText = computed(() => {
  // @iwp.link views/pages/home.md::n.6e43
  const normalizedName = nameInput.value.trim() || "World";
  // @iwp.link views/pages/home.md::n.79b4
  return `Hello, ${normalizedName}!`;
});

async function verifyBackendGreeting(): Promise<void> {
  // @iwp.link views/pages/home.md::n.7ba1
  backendStatus.value = "loading";
  backendError.value = "";
  try {
    const query = encodeURIComponent(nameInput.value);
    const response = await fetch(`/api/hello?name=${query}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = (await response.json()) as { status?: string; greeting?: string };
    if (payload.status !== "ok" || typeof payload.greeting !== "string") {
      throw new Error("Unexpected response");
    }
    backendGreeting.value = payload.greeting;
    backendStatus.value = "success";
  } catch (error) {
    backendStatus.value = "error";
    backendError.value = error instanceof Error ? error.message : "Unknown error";
  }
}

onMounted(() => {
  void verifyBackendGreeting();
});
</script>

<template>
  <section class="hello-page">
    <article class="hello-card">
      <p class="hello-badge">Desktop Hello World</p>
      <h1>{{ greetingText }}</h1>
      <p class="hello-tip">这是最小可运行的 Bun + Vue + IWP 桌面插件模板。</p>
      <label class="hello-label" for="name-input">Your name</label>
      <input id="name-input" v-model="nameInput" class="hello-input" placeholder="Type a name" />
      <!-- @iwp.link views/pages/home.md::n.c9d3 -->
      <p class="hello-api-tip">GET /api/hello?name=...</p>
      <button class="hello-verify-btn" :disabled="backendStatus === 'loading'" @click="verifyBackendGreeting">
        {{ backendStatus === "loading" ? "Verifying..." : "Verify Backend API" }}
      </button>
      <!-- @iwp.link views/pages/home.md::n.5bc5 -->
      <p v-if="backendStatus === 'success'" class="hello-backend-result">Backend: {{ backendGreeting }}</p>
      <p v-else-if="backendStatus === 'error'" class="hello-backend-error">Backend Error: {{ backendError }}</p>
    </article>
  </section>
</template>

<style scoped>
.hello-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 24px;
}

.hello-card {
  width: min(560px, 100%);
  padding: 24px;
  border: 1px solid #cbd5e1;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.hello-badge {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #475569;
}

h1 {
  margin: 0;
  font-size: clamp(28px, 5vw, 36px);
  line-height: 1.2;
}

.hello-tip {
  margin: 12px 0 18px;
  color: #334155;
}

.hello-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #334155;
}

.hello-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #94a3b8;
  border-radius: 10px;
  font-size: 14px;
}

.hello-input:focus {
  outline: 2px solid #bfdbfe;
  outline-offset: 2px;
  border-color: #3b82f6;
}

.hello-api-tip {
  margin: 14px 0 0;
  font-size: 13px;
  color: #475569;
}

.hello-verify-btn {
  margin-top: 12px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.hello-verify-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.hello-backend-result {
  margin: 10px 0 0;
  font-size: 13px;
  color: #0f766e;
}

.hello-backend-error {
  margin: 10px 0 0;
  font-size: 13px;
  color: #b91c1c;
}
</style>
