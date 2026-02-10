from __future__ import annotations

from typing import Any


def build_practice_head_html(*, colors: Any) -> str:
    return f"""
    <style>
    :root {{
        --echoflow-bg-primary: {colors.bg_primary};
        --echoflow-bg-secondary: {colors.bg_secondary};
        --echoflow-border: {colors.border};
        --echoflow-text-primary: {colors.text_primary};
        --echoflow-text-secondary: {colors.text_secondary};
        --echoflow-text-disabled: {colors.text_disabled};
        --echoflow-primary: {colors.primary};
        --echoflow-sentence-ch: 60;
    }}
    </style>
    <link rel="stylesheet" href="/echoflow-assets/practice.css">
    <script src="https://unpkg.com/wavesurfer.js@6.6.4/dist/wavesurfer.min.js"></script>
    <script src="https://unpkg.com/wavesurfer.js@6.6.4/dist/plugin/wavesurfer.regions.min.js"></script>
    <script src="/echoflow-assets/echoflow_recorder.js"></script>
    <script src="/echoflow-assets/echoflow_v2_waveform.js"></script>
    <script>
    (function () {{
      if (window.echoflowFitText) return;
      const ids = new Set();
      let timer = null;

      function fitOne(id, opts) {{
        const el = document.getElementById(id);
        if (!el) return;
        const max = Math.max(10, Number((opts && opts.max) || 26));
        const min = Math.max(8, Number((opts && opts.min) || 14));
        let size = max;
        el.style.fontSize = size + 'px';
        for (; size >= min; size--) {{
          el.style.fontSize = size + 'px';
          if (el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1) {{
            break;
          }}
        }}
      }}

      window.echoflowFitText = function (id, opts) {{
        ids.add(String(id || ''));
        fitOne(id, opts || null);
      }};

      window.addEventListener('resize', function () {{
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(function () {{
          ids.forEach(function (id) {{
            fitOne(id, null);
          }});
        }}, 120);
      }});
    }})();
    </script>
    <script>
    (function () {{
      if (window.echoflowTuneLayout) return;
      let timer = null;

      function setVar(name, value) {{
        document.documentElement.style.setProperty(name, String(value));
      }}

      function tune() {{
        const h = window.innerHeight || 0;
        if (!h) return;
        if (h < 740) {{
          setVar('--echoflow-top-max-h', '340px');
          setVar('--echoflow-wave-h', '86px');
          setVar('--echoflow-timeline-h', '44px');
          setVar('--echoflow-recognition-min-h', '84px');
          setVar('--echoflow-recognition-max-h', '140px');
        }} else if (h < 860) {{
          setVar('--echoflow-top-max-h', '400px');
          setVar('--echoflow-wave-h', '104px');
          setVar('--echoflow-timeline-h', '48px');
          setVar('--echoflow-recognition-min-h', '92px');
          setVar('--echoflow-recognition-max-h', '160px');
        }} else {{
          setVar('--echoflow-top-max-h', '520px');
          setVar('--echoflow-wave-h', '140px');
          setVar('--echoflow-timeline-h', '54px');
          setVar('--echoflow-recognition-min-h', '108px');
          setVar('--echoflow-recognition-max-h', '200px');
        }}

        try {{
          if (window.echoflowV2 && window.echoflowV2.resizeWave) {{
            window.echoflowV2.resizeWave();
          }}
        }} catch (e) {{}}
      }}

      window.echoflowTuneLayout = function () {{
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(tune, 60);
      }};

      window.addEventListener('resize', window.echoflowTuneLayout);
      window.setTimeout(tune, 0);
    }})();
    </script>
    <script>
    (function () {{
      if (window.echoflowVideoController) return;
      const state = {{ start: 0, end: 0, timer: null, muted: false }};

      function getVideo() {{
        return document.getElementById('echoflow-video');
      }}

      function getPlayButton() {{
        return document.getElementById('echoflow-video-play');
      }}

      function getAudio() {{
        return document.getElementById('reference-audio');
      }}

      function getNarrationAudio() {{
        return document.getElementById('echoflow-narration-audio');
      }}

      function clearTimer() {{
        if (state.timer) {{
          window.clearTimeout(state.timer);
          state.timer = null;
        }}
      }}

      function setPlayVisible(visible) {{
        const btn = getPlayButton();
        if (!btn) return;
        btn.style.opacity = visible ? '1' : '0';
        btn.style.pointerEvents = visible ? 'auto' : 'none';
      }}

      window.echoflowVideoController = {{
        setRange: function (start, end) {{
          state.start = Number(start) || 0;
          state.end = Number(end) || 0;
        }},
        setMuted: function (muted) {{
          state.muted = Boolean(muted);
          const v = getVideo();
          if (!v) return;
          try {{ v.muted = state.muted; }} catch (e) {{}}
        }},
        setSource: function (src, poster) {{
          const v = getVideo();
          if (!v) return;
          if (src && v.getAttribute('src') !== src) {{
            v.src = src;
          }}
          if (poster) {{
            v.poster = poster;
          }}
        }},
        freezeAt: function (t) {{
          const v = getVideo();
          if (!v) return;
          clearTimer();
          const tt = (t === undefined || t === null) ? (state.start || 0) : Number(t);
          try {{ v.currentTime = Math.max(0, tt || 0); }} catch (e) {{}}
          try {{ v.pause(); }} catch (e) {{}}
          setPlayVisible(true);
        }},
        stop: function () {{
          const v = getVideo();
          if (v) {{
            try {{ v.pause(); }} catch (e) {{}}
          }}
          clearTimer();
          setPlayVisible(true);
        }},
        playOnce: function (start, end) {{
          if (start !== undefined && end !== undefined) {{
            state.start = Number(start) || 0;
            state.end = Number(end) || 0;
          }}
          const v = getVideo();
          if (!v) return;
          try {{ v.muted = Boolean(state.muted); }} catch (e) {{}}
          const a = getAudio();
          if (a) {{
            try {{ a.pause(); }} catch (e) {{}}
          }}
          clearTimer();
          const start = state.start || 0;
          const end = state.end || 0;
          const dur = Math.max(0, end - start);
          try {{ v.currentTime = Math.max(0, start); }} catch (e) {{}}
          const p = v.play();
          if (p && p.catch) p.catch(function () {{}});
          setPlayVisible(false);
          state.timer = window.setTimeout(function () {{
            try {{ v.pause(); }} catch (e) {{}}
            setPlayVisible(true);
            try {{
              window.dispatchEvent(new CustomEvent('echoflowVideoClipEnded', {{ detail: {{ start: start, end: end }} }}));
            }} catch (e) {{}}
          }}, dur * 1000);
        }},
        play: function () {{
          window.echoflowVideoController.playOnce();
        }},
      }};

      document.addEventListener('click', function (ev) {{
        const t = ev.target;
        if (!(t instanceof Element)) return;
        if (t.id === 'echoflow-video-play') {{
          const na = getNarrationAudio();
          if (na) {{
            try {{ na.pause(); }} catch (e) {{}}
          }}
          window.echoflowVideoController.playOnce();
        }}
      }}, true);

      window.setTimeout(function () {{
        if (window.echoflowVideoPending && window.echoflowVideoController) {{
          const p = window.echoflowVideoPending;
          window.echoflowVideoController.setSource(p.src, p.poster || null);
          window.echoflowVideoController.setRange(p.start, p.end);
          window.echoflowVideoPending = null;
        }}
        const v = getVideo();
        if (v) {{
          v.addEventListener('pause', function () {{ setPlayVisible(true); }});
          v.addEventListener('ended', function () {{ setPlayVisible(true); }});
        }}
      }}, 0);
    }})();
    </script>
    """
