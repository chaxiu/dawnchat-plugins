const { createApp, ref, reactive, onMounted } = Vue;

createApp({
  setup() {
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
      const data = await resp.json();
      status.value = data;
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
      if (!item || typeof item !== "object") return "";
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

    return {
      form,
      models,
      status,
      loading,
      result,
      error,
      run,
      loadModels,
      loadStatus,
      formatModelLabel,
    };
  },
}).mount("#app");
