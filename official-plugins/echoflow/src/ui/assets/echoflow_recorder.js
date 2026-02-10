(function () {
  window.echoflowRecorder = window.echoflowRecorder || {};

  window.echoflowRecorder.start = async function (preferredId) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const wantedId = preferredId || "default";
      try {
        window.localStorage.setItem("echoflow_mic_device_id", wantedId);
      } catch (e) {}

      const usedPreferredId = !!wantedId;
      if (wantedId && wantedId !== "default") {
        constraints.audio.deviceId = { exact: wantedId };
      }

      let stream = null;
      let fallbackUsed = false;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        if (usedPreferredId) {
          const fallbackConstraints = {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          };
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          fallbackUsed = true;
        } else {
          throw e;
        }
      }

      const tracks = stream && stream.getAudioTracks ? stream.getAudioTracks() : [];
      const track = tracks.length ? tracks[0] : null;
      const trackSettings = track && track.getSettings ? track.getSettings() : {};
      const trackInfo = track
        ? {
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            label: track.label,
            settings: trackSettings,
          }
        : null;

      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextCtor();
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const gain = ctx.createGain();
      gain.gain.value = 0.0;

      const buffers = [];
      const stats = { peak: 0.0, rmsSum: 0.0, rmsCount: 0 };

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        buffers.push(copy);

        let sumSq = 0.0;
        let localPeak = 0.0;
        for (let i = 0; i < input.length; i++) {
          const v = Math.abs(input[i]);
          if (v > localPeak) localPeak = v;
          sumSq += input[i] * input[i];
        }
        const rms = Math.sqrt(sumSq / input.length);
        stats.rmsSum += rms;
        stats.rmsCount += 1;
        if (localPeak > stats.peak) stats.peak = localPeak;
      };

      source.connect(processor);
      processor.connect(gain);
      gain.connect(ctx.destination);

      window._echoflow_audio = {
        ctx,
        stream,
        source,
        processor,
        gain,
        buffers,
        stats,
        trackInfo,
      };

      return { ok: true, preferredId: wantedId, usedPreferredId, fallbackUsed, trackInfo };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  };

  window.echoflowRecorder.stop = async function () {
    const rec = window._echoflow_audio;
    if (!rec) return null;

    try {
      try {
        rec.processor.disconnect();
      } catch (e) {}
      try {
        rec.source.disconnect();
      } catch (e) {}

      if (rec.stream && rec.stream.getTracks) {
        rec.stream.getTracks().forEach((t) => t.stop());
      }

      const ctx = rec.ctx;
      const inputSampleRate = ctx ? ctx.sampleRate : 48000;
      if (ctx && ctx.state !== "closed") {
        try {
          await ctx.close();
        } catch (e) {}
      }

      const buffers = rec.buffers || [];
      let length = 0;
      for (const b of buffers) length += b.length;
      if (length <= 0) {
        return {
          wav_base64: null,
          diagnostics: { inputSampleRate, inputSamples: 0, trackInfo: rec.trackInfo },
        };
      }

      const merged = new Float32Array(length);
      let offset = 0;
      for (const b of buffers) {
        merged.set(b, offset);
        offset += b.length;
      }

      const outputSampleRate = 16000;
      const ratio = inputSampleRate / outputSampleRate;
      const outputSamples = Math.max(1, Math.round(merged.length / ratio));
      const resampled = new Float32Array(outputSamples);

      for (let i = 0; i < outputSamples; i++) {
        const srcPos = i * ratio;
        const i0 = Math.floor(srcPos);
        const i1 = Math.min(merged.length - 1, i0 + 1);
        const t = srcPos - i0;
        resampled[i] = merged[i0] * (1 - t) + merged[i1] * t;
      }

      let peak = 0.0;
      let sumSq = 0.0;
      for (let i = 0; i < resampled.length; i++) {
        const v = Math.abs(resampled[i]);
        if (v > peak) peak = v;
        sumSq += resampled[i] * resampled[i];
      }
      const rms = Math.sqrt(sumSq / resampled.length);

      const numChannels = 1;
      const bitsPerSample = 16;
      const blockAlign = (numChannels * bitsPerSample) / 8;
      const byteRate = outputSampleRate * blockAlign;
      const dataSize = resampled.length * blockAlign;
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      const writeString = (off, str) => {
        for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
      };

      writeString(0, "RIFF");
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, outputSampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);
      writeString(36, "data");
      view.setUint32(40, dataSize, true);

      let writeOff = 44;
      for (let i = 0; i < resampled.length; i++) {
        let s = Math.max(-1, Math.min(1, resampled[i]));
        s = s < 0 ? s * 0x8000 : s * 0x7fff;
        view.setInt16(writeOff, s, true);
        writeOff += 2;
      }

      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
      }

      const stats = rec.stats || { peak: 0, rmsSum: 0, rmsCount: 0 };
      const diagnostics = {
        inputSampleRate,
        outputSampleRate,
        inputSamples: merged.length,
        outputSamples: resampled.length,
        peak,
        rms,
        peakDuringCapture: stats.peak || 0,
        rmsAvgDuringCapture: stats.rmsCount ? stats.rmsSum / stats.rmsCount : 0,
        trackInfo: rec.trackInfo,
      };

      window._echoflow_audio = null;
      return { wav_base64: btoa(binary), diagnostics };
    } finally {
      window._echoflow_audio = null;
    }
  };
})();

