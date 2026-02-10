(function () {
  window.echoflowV2 = window.echoflowV2 || {};

  function getWaveContainer() {
    return document.getElementById("echoflow-v2-waveform");
  }

  function getTimelineContainer() {
    return document.getElementById("echoflow-v2-timeline");
  }

  function getInsertionsContainer() {
    return document.getElementById("echoflow-v2-insertions");
  }

  function readWaveHeight(container) {
    if (!container) return 140;
    const rect = container.getBoundingClientRect ? container.getBoundingClientRect() : null;
    const h1 = rect ? Math.round(rect.height) : 0;
    if (h1 > 0) return h1;
    try {
      const cs = window.getComputedStyle(container);
      const h2 = Math.round(Number.parseFloat(cs.height || "0") || 0);
      if (h2 > 0) return h2;
    } catch (e) {}
    const h3 = Math.round(Number(container.clientHeight || 0));
    return h3 > 0 ? h3 : 140;
  }

  function syncTrackWidth(px) {
    const wave = getWaveContainer();
    if (!wave) return;
    const waveW = Math.round(Number(wave.getBoundingClientRect().width || 0));
    const w = Math.round(Number(px || 0));
    const shouldNarrow = w > 0 && waveW > 0 && w < waveW - 2;

    const timeline = getTimelineContainer();
    const insertions = getInsertionsContainer();
    for (const el of [timeline, insertions]) {
      if (!el) continue;
      if (shouldNarrow) {
        el.style.width = w + "px";
        el.style.marginLeft = "auto";
        el.style.marginRight = "auto";
      } else {
        el.style.width = "";
        el.style.marginLeft = "";
        el.style.marginRight = "";
      }
    }
  }

  function applyWaveCentering(ws) {
    if (!ws) return;
    const container = getWaveContainer();
    const wrapper = ws.drawer && ws.drawer.wrapper ? ws.drawer.wrapper : null;
    if (!container || !wrapper) return;

    const containerW = Math.round(Number(container.getBoundingClientRect().width || 0));
    const wrapperW = Math.round(Number(wrapper.getBoundingClientRect().width || 0));
    if (containerW > 0 && wrapperW > 0 && wrapperW < containerW - 2) {
      wrapper.style.marginLeft = "auto";
      wrapper.style.marginRight = "auto";
      syncTrackWidth(wrapperW);
    } else {
      wrapper.style.marginLeft = "";
      wrapper.style.marginRight = "";
      syncTrackWidth(0);
    }
  }

  window.echoflowV2.playSpan = function (startS, endS) {
    const ws = window.echoflowV2.ws;
    if (!ws) return;
    const s = Math.max(0, Number(startS) || 0);
    const e = Math.max(0, Number(endS) || 0);
    const duration = ws.getDuration ? ws.getDuration() : 0;
    const end = duration && e > 0 ? Math.min(e, duration) : e;
    if (end > s) {
      ws.play(s, end);
    } else {
      ws.play(s);
    }
  };

  window.echoflowV2.renderWave = function (audioUrl, theme) {
    const container = getWaveContainer();
    if (!container) return;

    window.echoflowV2.lastAudioUrl = audioUrl;
    window.echoflowV2.lastTheme = theme;
    window.echoflowV2.waveHeight = readWaveHeight(container);

    if (window.echoflowV2.ws) {
      try {
        window.echoflowV2.ws.destroy();
      } catch (e) {}
      window.echoflowV2.ws = null;
    }

    const ws = WaveSurfer.create({
      container,
      backend: "MediaElement",
      height: window.echoflowV2.waveHeight,
      responsive: true,
      normalize: true,
      waveColor: theme.waveColor,
      progressColor: theme.progressColor,
      cursorColor: theme.cursorColor,
      plugins: [WaveSurfer.regions.create({})],
    });

    window.echoflowV2.ws = ws;
    ws.on("ready", () => applyWaveCentering(ws));
    ws.load(audioUrl);
  };

  window.echoflowV2.resizeWave = function () {
    const ws = window.echoflowV2.ws;
    const container = getWaveContainer();
    if (!ws || !container) return;

    const newHeight = readWaveHeight(container);
    const oldHeight = Math.round(Number(window.echoflowV2.waveHeight || 0));
    if (!newHeight || Math.abs(newHeight - oldHeight) < 2) return;
    window.echoflowV2.waveHeight = newHeight;

    try {
      if (typeof ws.setHeight === "function") {
        ws.setHeight(newHeight);
        if (typeof ws.drawBuffer === "function") ws.drawBuffer();
        applyWaveCentering(ws);
        return;
      }
      if (ws.drawer && typeof ws.drawer.setHeight === "function") {
        ws.drawer.setHeight(newHeight);
        if (typeof ws.drawBuffer === "function") ws.drawBuffer();
        applyWaveCentering(ws);
        return;
      }
    } catch (e) {}

    if (window.echoflowV2._isResizing) return;
    const audioUrl = window.echoflowV2.lastAudioUrl;
    const theme = window.echoflowV2.lastTheme;
    if (!audioUrl || !theme) return;

    window.echoflowV2._isResizing = true;
    try {
      window.echoflowV2.renderWave(audioUrl, theme);
      window.echoflowV2.renderRegions(window.echoflowV2.lastRegions || []);
    } finally {
      window.echoflowV2._isResizing = false;
    }
  };

  window.echoflowV2.renderRegions = function (regions) {
    window.echoflowV2.lastRegions = regions || [];
    const ws = window.echoflowV2.ws;
    if (!ws) return;

    const apply = () => {
      try {
        ws.clearRegions();
      } catch (e) {}

      for (const r of regions || []) {
        const start = Math.max(0, Number(r.start_s) || 0);
        const end = Math.max(0, Number(r.end_s) || 0);
        const color = String(r.color || "rgba(0,0,0,0.1)");

        const region = ws.addRegion({
          start,
          end: Math.max(start + 0.03, end),
          drag: false,
          resize: false,
          color,
        });

        region.on("click", (e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          region.play();
        });
      }
    };

    if (ws.isReady) apply();
    else ws.once("ready", apply);
  };
})();
