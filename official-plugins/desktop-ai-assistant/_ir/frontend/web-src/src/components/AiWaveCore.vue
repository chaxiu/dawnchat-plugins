<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    welcomeText?: string;
    mode?: "hero" | "dock";
    motionMode?: "idle" | "active";
    showGreeting?: boolean;
  }>(),
  {
    welcomeText: "Hello, I am your AI assistant",
    mode: "hero",
    motionMode: "idle",
    showGreeting: true,
  },
);

const hostRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

let rafId = 0;
let resizeObserver: ResizeObserver | null = null;
let frameTimer = 0;
let phase = 0;
let pulse = 0;
let pointerEnergy = 0;
let pointerX = 0;
let pointerY = 0;
let shouldReduceMotion = false;
let unbindPointerListeners: (() => void) | null = null;
let canvasContextUnavailable = false;

const isDockMode = computed(() => props.mode === "dock");

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function setupCanvasSize(): void {
  if (!hostRef.value || !canvasRef.value) {
    return;
  }
  const rect = hostRef.value.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasRef.value.width = Math.floor(width * dpr);
  canvasRef.value.height = Math.floor(height * dpr);
  canvasRef.value.style.width = `${width}px`;
  canvasRef.value.style.height = `${height}px`;
}

function buildWavePath(cx: number, cy: number, baseRadius: number, waveAmp: number): Path2D {
  const path = new Path2D();
  const segments = 160;
  for (let i = 0; i <= segments; i += 1) {
    const theta = (i / segments) * Math.PI * 2;
    const displacement =
      Math.sin(theta * 3 + phase * 1.05 + pointerX * 0.4) * waveAmp +
      Math.sin(theta * 5 - phase * 0.75 + pointerY * 0.35) * waveAmp * 0.28 +
      Math.sin(theta * 7 + phase * 0.45) * waveAmp * 0.07;
    const r = baseRadius + displacement + pointerEnergy * 3.5 + pulse * 2;
    const x = cx + Math.cos(theta) * r;
    const y = cy + Math.sin(theta) * r;
    if (i === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  path.closePath();
  return path;
}

function drawFrame(timestamp: number): void {
  if (!canvasRef.value || !hostRef.value) {
    return;
  }
  if (canvasContextUnavailable) {
    return;
  }
  const isDocumentVisible = typeof document === "undefined" ? true : document.visibilityState === "visible";
  const targetFps = (() => {
    if (!isDocumentVisible) {
      return 8;
    }
    if (shouldReduceMotion) {
      return isDockMode.value ? 10 : 12;
    }
    if (props.mode === "dock") {
      return props.motionMode === "active" ? 24 : 18;
    }
    return props.motionMode === "active" ? 52 : 42;
  })();
  const frameInterval = 1000 / targetFps;
  if (timestamp - frameTimer < frameInterval) {
    rafId = requestAnimationFrame(drawFrame);
    return;
  }

  const delta = timestamp - frameTimer || frameInterval;
  frameTimer = timestamp;
  const phaseStep = (() => {
    if (shouldReduceMotion) {
      return 0.00085;
    }
    if (props.mode === "dock") {
      return props.motionMode === "active" ? 0.0017 : 0.001;
    }
    return props.motionMode === "active" ? 0.00195 : 0.0014;
  })();
  phase += delta * phaseStep;

  pointerEnergy *= 0.94;
  pulse *= 0.9;

  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvasRef.value.getContext("2d");
  } catch {
    canvasContextUnavailable = true;
    return;
  }
  if (!ctx) {
    canvasContextUnavailable = true;
    return;
  }

  const rect = hostRef.value.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2 + pointerX * (props.mode === "dock" ? 8 : 14);
  const cy = props.mode === "dock" ? height / 2 + pointerY * 8 : height * 0.38 + pointerY * 10;
  const minSide = Math.min(width, height);
  const breath = 1 + Math.sin(phase * 0.85) * 0.028;
  const baseR = minSide * (props.mode === "dock" ? 0.26 : 0.23) * breath;
  const waveAmp = shouldReduceMotion ? 5.5 : 6 + pulse * 2 + (props.motionMode === "active" ? 2 : 0);

  const path = buildWavePath(cx, cy, baseR, waveAmp);

  const outerBlur = shouldReduceMotion ? 20 : props.mode === "dock" ? 24 : 42;
  const midBlur = shouldReduceMotion ? 9 : props.mode === "dock" ? 12 : 18;

  const drift = Math.sin(phase * 0.35) * minSide * 0.02;
  if (props.mode === "hero") {
    const ambient = ctx.createRadialGradient(
      cx + drift * 0.5,
      cy - minSide * 0.06,
      0,
      cx,
      cy,
      baseR * 3.4,
    );
    ambient.addColorStop(0, "rgba(34, 211, 238, 0.16)");
    ambient.addColorStop(0.28, "rgba(99, 102, 241, 0.11)");
    ambient.addColorStop(0.52, "rgba(167, 139, 250, 0.08)");
    ambient.addColorStop(0.78, "rgba(56, 189, 248, 0.04)");
    ambient.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = ambient;
    ctx.fillRect(0, 0, width, height);

    const ambient2 = ctx.createRadialGradient(
      width * 0.72 + drift,
      height * 0.55,
      0,
      width * 0.55,
      height * 0.48,
      baseR * 2.8,
    );
    ambient2.addColorStop(0, "rgba(129, 140, 248, 0.09)");
    ambient2.addColorStop(0.55, "rgba(14, 165, 233, 0.05)");
    ambient2.addColorStop(1, "rgba(2, 6, 23, 0)");
    ctx.fillStyle = ambient2;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  ctx.filter = `blur(${outerBlur}px)`;
  ctx.globalAlpha = shouldReduceMotion ? 0.42 : 0.55;
  ctx.fillStyle = "rgba(236, 254, 255, 0.92)";
  ctx.fill(path);

  ctx.filter = `blur(${midBlur}px)`;
  ctx.globalAlpha = shouldReduceMotion ? 0.45 : 0.58;
  const midGrad = ctx.createRadialGradient(cx - baseR * 0.08, cy - baseR * 0.1, 0, cx, cy, baseR * 1.45);
  midGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
  midGrad.addColorStop(0.32, "rgba(207, 250, 254, 0.55)");
  midGrad.addColorStop(0.58, "rgba(165, 180, 252, 0.38)");
  midGrad.addColorStop(0.82, "rgba(129, 140, 248, 0.18)");
  midGrad.addColorStop(1, "rgba(99, 102, 241, 0.06)");
  ctx.fillStyle = midGrad;
  ctx.fill(path);

  ctx.filter = "none";
  ctx.globalAlpha = 1;
  const coreGrad = ctx.createRadialGradient(cx - baseR * 0.06, cy - baseR * 0.08, 0, cx, cy, baseR * 1.08);
  coreGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
  coreGrad.addColorStop(0.28, "rgba(240, 253, 255, 0.98)");
  coreGrad.addColorStop(0.55, "rgba(224, 242, 254, 0.72)");
  coreGrad.addColorStop(0.78, "rgba(165, 243, 252, 0.42)");
  coreGrad.addColorStop(1, "rgba(129, 140, 248, 0.22)");
  ctx.fillStyle = coreGrad;
  ctx.fill(path);

  ctx.restore();

  rafId = requestAnimationFrame(drawFrame);
}

onMounted(() => {
  if (!hostRef.value || !canvasRef.value) {
    return;
  }
  const hostEl = hostRef.value;

  shouldReduceMotion =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  setupCanvasSize();

  const onMove = (event: PointerEvent) => {
    const rect = hostEl.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    pointerX = clamp(normalizedX, -1, 1);
    pointerY = clamp(normalizedY, -1, 1);
    pointerEnergy = Math.min(1, pointerEnergy + 0.12);
  };

  const onLeave = () => {
    pointerX = 0;
    pointerY = 0;
  };

  const onClick = () => {
    pulse = 1;
    pointerEnergy = Math.min(1, pointerEnergy + 0.28);
  };

  hostEl.addEventListener("pointermove", onMove);
  hostEl.addEventListener("pointerleave", onLeave);
  hostEl.addEventListener("click", onClick);
  unbindPointerListeners = () => {
    hostEl.removeEventListener("pointermove", onMove);
    hostEl.removeEventListener("pointerleave", onLeave);
    hostEl.removeEventListener("click", onClick);
  };

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      setupCanvasSize();
    });
    resizeObserver.observe(hostEl);
  }

  frameTimer = performance.now();
  rafId = requestAnimationFrame(drawFrame);
});

onUnmounted(() => {
  unbindPointerListeners?.();
  unbindPointerListeners = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  cancelAnimationFrame(rafId);
});
</script>

<template>
  <section ref="hostRef" class="welcome-orb" :class="{ 'welcome-orb--dock': isDockMode }">
    <canvas ref="canvasRef" class="welcome-orb__canvas" aria-hidden="true"></canvas>
    <p v-if="props.showGreeting" class="welcome-orb__greeting">{{ props.welcomeText }}</p>
  </section>
</template>

<style scoped>
.welcome-orb {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(ellipse 130% 85% at 50% 36%, rgba(34, 211, 238, 0.14), transparent 58%),
    radial-gradient(ellipse 100% 75% at 78% 58%, rgba(99, 102, 241, 0.12), transparent 52%),
    radial-gradient(ellipse 90% 80% at 18% 62%, rgba(167, 139, 250, 0.09), transparent 55%),
    radial-gradient(circle at 50% 120%, rgba(15, 23, 42, 0.88), #020617);
}
.welcome-orb--dock {
  min-height: 0;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(8, 47, 73, 0.38) 0%, rgba(2, 6, 23, 0.06) 68%, rgba(2, 6, 23, 0) 100%);
}

.welcome-orb__canvas {
  position: absolute;
  inset: 0;
}

.welcome-orb__greeting {
  position: absolute;
  z-index: 1;
  left: 50%;
  bottom: max(8%, 1.5rem);
  transform: translateX(-50%);
  margin: 0;
  max-width: min(92vw, 28rem);
  padding: 0.65rem 1.15rem;
  border-radius: 999px;
  border: 1px solid rgba(165, 243, 252, 0.18);
  background: rgba(2, 8, 24, 0.38);
  backdrop-filter: blur(10px);
  font-size: clamp(0.9rem, 2.1vw, 1.05rem);
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0.01em;
  color: rgba(248, 250, 255, 0.94);
  text-align: center;
  pointer-events: none;
  text-shadow:
    0 0 20px rgba(34, 211, 238, 0.25),
    0 0 32px rgba(99, 102, 241, 0.2);
}
</style>
