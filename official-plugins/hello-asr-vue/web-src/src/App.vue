<template>
  <div class="container">
    <section class="card">
      <h1 class="title">Hello ASR (Vue)</h1>
      <p class="subtitle">Whisper 转写 + 可选说话人识别（diarization）测试插件</p>
    </section>

    <section class="card">
      <div class="grid">
        <div>
          <label>音频路径</label>
          <input v-model="form.audio_path" placeholder="/absolute/path/to/audio.wav" />
        </div>
        <div>
          <label>语言（可选）</label>
          <input v-model="form.language" placeholder="zh / en / ja" />
        </div>
        <div>
          <label>Whisper 模型（dawnchat.asr.list_models）</label>
          <select v-model="form.model_size">
            <option value="">自动</option>
            <option v-for="item in models" :key="item.id" :value="item.id">
              {{ formatModelLabel(item) }}
            </option>
          </select>
        </div>
        <div>
          <label>说话人数（可选）</label>
          <input v-model="form.num_speakers" type="number" min="1" step="1" />
        </div>
      </div>

      <div class="row">
        <input id="diarization-check" v-model="form.enable_diarization" type="checkbox" />
        <label for="diarization-check">识别说话人（diarization）</label>
      </div>

      <div class="row">
        <button class="btn" :disabled="loading" @click="run">{{ loading ? "执行中..." : "开始识别" }}</button>
        <button @click="loadModels">刷新模型列表</button>
        <button @click="loadStatus">刷新 ASR 状态</button>
      </div>
    </section>

    <section class="card">
      <div class="hint">ASR 状态（dawnchat.asr.status）</div>
      <pre>{{ JSON.stringify(status, null, 2) }}</pre>
    </section>

    <section class="card" v-if="error">
      <div class="err">{{ error }}</div>
    </section>

    <section class="card">
      <div class="hint">结果</div>
      <textarea readonly :value="JSON.stringify(result, null, 2)"></textarea>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";

const form = reactive({
  audio_path: "",
  language: "",
  model_size: "",
  num_speakers: "",
  enable_diarization: true,
});
const models = ref([]);
const status = ref(null);
const loading = ref(false);
const result = ref(null);
const error = ref("");

async function loadStatus() {
  const resp = await fetch("/api/asr/status");
  status.value = await resp.json();
}

async function loadModels() {
  const resp = await fetch("/api/asr/models");
  const data = await resp.json();
  const rawModels = data?.data?.models || [];
  models.value = Array.isArray(rawModels)
    ? rawModels
        .map((item) => ({
          id: String(item?.id || item?.size || "").trim(),
          name: String(item?.name || item?.description || item?.id || item?.size || "").trim(),
          installed: !!item?.installed,
        }))
        .filter((item) => item.id)
    : [];
  if (!form.model_size) {
    const installed = models.value.find((m) => m?.installed);
    form.model_size = installed?.id || "";
  }
}

function formatModelLabel(item) {
  if (!item || typeof item !== "object") {
    return "";
  }
  const modelId = String(item.id || "");
  const modelName = String(item.name || modelId || "unknown");
  const statusText = item.installed ? "已安装" : "未安装";
  if (modelName && modelName !== modelId) {
    return `${modelName} (${modelId}) - ${statusText}`;
  }
  return `${modelId} - ${statusText}`;
}

async function run() {
  error.value = "";
  result.value = null;
  if (!form.audio_path.trim()) {
    error.value = "请先输入音频路径";
    return;
  }
  loading.value = true;
  try {
    const payload = {
      audio_path: form.audio_path.trim(),
      enable_diarization: !!form.enable_diarization,
    };
    if (form.language.trim()) payload.language = form.language.trim();
    if (form.model_size.trim()) payload.model_size = form.model_size.trim();
    if (form.num_speakers !== "") payload.num_speakers = Number(form.num_speakers);
    const resp = await fetch("/api/asr/transcribe_with_speakers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    result.value = await resp.json();
  } catch (e) {
    error.value = String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadStatus(), loadModels()]);
});
</script>

<style scoped>
.container {
  max-width: 920px;
  margin: 0 auto;
}
.card {
  background: #111827;
  border: 1px solid #253044;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
}
.title {
  margin: 0;
  font-size: 22px;
}
.subtitle {
  margin: 6px 0 0;
  color: #9ca3af;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
label {
  display: block;
  font-size: 12px;
  margin-bottom: 6px;
  color: #9ca3af;
}
input,
select,
button,
textarea {
  width: 100%;
  border: 1px solid #334155;
  border-radius: 8px;
  background: #0f172a;
  color: #e5e7eb;
  padding: 9px;
  box-sizing: border-box;
}
textarea {
  min-height: 220px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}
.row input[type="checkbox"] {
  width: auto;
}
.row label {
  margin: 0;
}
.btn {
  background: #2563eb;
  border: none;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.hint {
  font-size: 12px;
  color: #93c5fd;
}
.err {
  color: #fca5a5;
}
</style>
