<script setup lang="ts">
import * as THREE from "three";
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  CORE_FRAGMENT_SHADER,
  CORE_VERTEX_SHADER,
  PARTICLE_FRAGMENT_SHADER,
  PARTICLE_VERTEX_SHADER,
  SHELL_FRAGMENT_SHADER,
  SHELL_VERTEX_SHADER,
} from "../../../logic/rendering/holographic/shaders";
import { defaultHomeScene } from "../../../models/home_scene";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const bootProgress = ref(0);

const params = defaultHomeScene.defaults;

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let coreMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null;
let shellMesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | null = null;
let pointCloud: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
let rafId = 0;
let startTs = 0;
const mouseTarget = new THREE.Vector2(0, 0);
const mouseCurrent = new THREE.Vector2(0, 0);
const lastMouse = new THREE.Vector2(0, 0);
let mouseImpulse = 0;
let mouseForceCurrent = 0;
const clickTarget = new THREE.Vector2(0, 0);
let clickPulse = 0;
const clickBurstX = ref(50);
const clickBurstY = ref(50);
const clickBurstKey = ref(0);

type Resource = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
};
const resources: Resource[] = [];

function track(geometry: THREE.BufferGeometry, material: THREE.Material): void {
  resources.push({ geometry, material });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const raw = normalized.length === 3 ? normalized.split("").map((c) => `${c}${c}`).join("") : normalized;
  const value = Number.parseInt(raw, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const sceneBackgroundStyle = computed(() => ({
  background: `
    radial-gradient(circle at 50% 45%, ${withAlpha(params.coreColor, 0.16)}, transparent 45%),
    radial-gradient(circle at 18% 24%, ${withAlpha(params.coreColor, 0.2)}, transparent 42%),
    radial-gradient(circle at 80% 18%, ${withAlpha(params.particleColor, 0.18)}, transparent 44%),
    linear-gradient(165deg, #01030b 0%, #030a1c 52%, ${params.backgroundColor} 100%)
  `,
}));

function createCoreMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWaveSpeed: { value: params.waveSpeed },
      uColorA: { value: new THREE.Color(params.coreColor) },
      uColorB: { value: new THREE.Color(params.particleColor) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uMouseForce: { value: 0 },
      uClick: { value: new THREE.Vector2(0, 0) },
      uClickPulse: { value: 0 },
    },
    vertexShader: CORE_VERTEX_SHADER,
    fragmentShader: CORE_FRAGMENT_SHADER,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function createShellMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWaveSpeed: { value: params.waveSpeed },
      uColor: { value: new THREE.Color(params.coreColor) },
    },
    vertexShader: SHELL_VERTEX_SHADER,
    fragmentShader: SHELL_FRAGMENT_SHADER,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
}

function createDataParticles(count: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const radius = 2.0 + Math.random() * 1.4;
    const y = (Math.random() - 0.5) * 2.4;
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * radius;
    phase[i] = Math.random() * Math.PI * 2;
    sizes[i] = 1 + Math.random() * 0.2;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  return geometry;
}

function createParticleMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWaveSpeed: { value: params.waveSpeed },
      uParticleSize: { value: params.particleSize },
      uColor: { value: new THREE.Color(params.particleColor) },
    },
    vertexShader: PARTICLE_VERTEX_SHADER,
    fragmentShader: PARTICLE_FRAGMENT_SHADER,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function animate(): void {
  if (!renderer || !scene || !camera || !coreMesh || !shellMesh || !pointCloud) {
    return;
  }
  const t = (performance.now() - startTs) / 1000;
  mouseCurrent.lerp(mouseTarget, 0.14);
  mouseImpulse *= 0.9;
  clickPulse *= 0.9;
  mouseForceCurrent += (mouseImpulse - mouseForceCurrent) * 0.16;

  coreMesh.material.uniforms.uTime.value = t;
  coreMesh.material.uniforms.uWaveSpeed.value = params.waveSpeed;
  coreMesh.material.uniforms.uMouse.value.copy(mouseCurrent);
  coreMesh.material.uniforms.uMouseForce.value = mouseForceCurrent;
  coreMesh.material.uniforms.uClick.value.copy(clickTarget);
  coreMesh.material.uniforms.uClickPulse.value = clickPulse;
  shellMesh.material.uniforms.uTime.value = t;
  shellMesh.material.uniforms.uWaveSpeed.value = params.waveSpeed;
  pointCloud.material.uniforms.uTime.value = t;
  pointCloud.material.uniforms.uWaveSpeed.value = params.waveSpeed;
  pointCloud.material.uniforms.uParticleSize.value = params.particleSize;

  coreMesh.rotation.y = t * 0.14 + mouseCurrent.x * 0.36;
  coreMesh.rotation.x = mouseCurrent.y * 0.34;
  shellMesh.rotation.y = -t * 0.08 - mouseCurrent.x * 0.14;
  shellMesh.rotation.x = -mouseCurrent.y * 0.14;
  pointCloud.rotation.y = -t * 0.06 - mouseCurrent.x * 0.12;
  pointCloud.rotation.x = mouseCurrent.y * 0.06;

  const progress = Math.min(100, Math.floor((t / 4) * 100));
  bootProgress.value = progress;

  renderer.render(scene, camera);
  rafId = requestAnimationFrame(animate);
}

function cleanup(): void {
  cancelAnimationFrame(rafId);
  for (const item of resources) {
    item.geometry.dispose();
    item.material.dispose();
  }
  resources.length = 0;
  renderer?.dispose();
  scene = null;
  camera = null;
  renderer = null;
  coreMesh = null;
  shellMesh = null;
  pointCloud = null;
}

onMounted(() => {
  if (!canvasRef.value) return;
  const canvas = canvasRef.value;
  const parent = canvas.parentElement;
  if (!parent) return;
  const width = parent.clientWidth;
  const height = parent.clientHeight;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 100);
  camera.position.set(0, 0, 5.8);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);

  scene.add(new THREE.AmbientLight(params.coreColor, 0.5));
  const mainLight = new THREE.PointLight(params.coreColor, 1.6, 20);
  mainLight.position.set(2.1, 2.5, 3.5);
  scene.add(mainLight);

  const coreGeo = new THREE.SphereGeometry(1.08, 96, 96);
  const coreMat = createCoreMaterial();
  coreMesh = new THREE.Mesh(coreGeo, coreMat);
  track(coreGeo, coreMat);
  scene.add(coreMesh);

  const shellGeo = new THREE.SphereGeometry(1.64, 64, 64);
  const shellMat = createShellMaterial();
  shellMesh = new THREE.Mesh(shellGeo, shellMat);
  track(shellGeo, shellMat);
  scene.add(shellMesh);

  const dataGeo = createDataParticles(1000);
  const dataMat = createParticleMaterial();
  pointCloud = new THREE.Points(dataGeo, dataMat);
  track(dataGeo, dataMat);
  scene.add(pointCloud);

  const onMouseMove = (event: MouseEvent) => {
    const rect = parent.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    mouseTarget.set(x, y);
    const velocity = mouseTarget.distanceTo(lastMouse);
    mouseImpulse = Math.min(0.72, mouseImpulse + velocity * 1.6);
    lastMouse.copy(mouseTarget);
  };

  const onMouseLeave = () => {
    mouseTarget.set(0, 0);
    mouseImpulse *= 0.6;
  };

  const onClick = (event: MouseEvent) => {
    const rect = parent.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    clickTarget.set(x, y);
    clickPulse = 1.0;
    mouseImpulse = Math.min(0.86, mouseImpulse + 0.25);
    clickBurstX.value = ((event.clientX - rect.left) / rect.width) * 100;
    clickBurstY.value = ((event.clientY - rect.top) / rect.height) * 100;
    clickBurstKey.value += 1;
  };

  const onResize = () => {
    if (!camera || !renderer || !parent) return;
    const nextWidth = parent.clientWidth;
    const nextHeight = parent.clientHeight;
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(nextWidth, nextHeight);
  };

  window.addEventListener("resize", onResize);
  parent.addEventListener("mousemove", onMouseMove);
  parent.addEventListener("mouseleave", onMouseLeave);
  parent.addEventListener("click", onClick);
  startTs = performance.now();
  animate();

  onUnmounted(() => {
    window.removeEventListener("resize", onResize);
    parent.removeEventListener("mousemove", onMouseMove);
    parent.removeEventListener("mouseleave", onMouseLeave);
    parent.removeEventListener("click", onClick);
    cleanup();
  });
});
</script>

<template>
  <main class="scene holo-scene" :style="sceneBackgroundStyle">
    <canvas ref="canvasRef" class="canvas"></canvas>
    <div class="scanlines"></div>
    <div class="grid-overlay"></div>
    <div
      :key="clickBurstKey"
      class="click-burst"
      :style="{ left: `${clickBurstX}%`, top: `${clickBurstY}%` }"
    ></div>

    <header class="hud-panel">
      <h2>Command Orb</h2>
      <p><span>Particle Size</span><strong>{{ params.particleSize }}</strong></p>
      <p><span>Particle Color</span><strong>{{ params.particleColor }}</strong></p>
      <p><span>Background</span><strong>{{ params.backgroundColor }}</strong></p>
      <p><span>Core Color</span><strong>{{ params.coreColor }}</strong></p>
      <p><span>Wave Speed</span><strong>{{ params.waveSpeed }}</strong></p>
      <p><span>Boot</span><strong>{{ bootProgress }}%</strong></p>
    </header>

    <div class="title-wrap">
      <h1 class="title">{{ params.welcomeText }}</h1>
    </div>
  </main>
</template>

<style scoped>
.scene {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.canvas,
.scanlines,
.grid-overlay {
  position: absolute;
  inset: 0;
}

.scanlines {
  background: repeating-linear-gradient(
    to bottom,
    rgba(125, 211, 252, 0.03) 0 1px,
    transparent 1px 4px
  );
  mix-blend-mode: screen;
  pointer-events: none;
}

.grid-overlay {
  background:
    linear-gradient(rgba(59, 130, 246, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at 50% 50%, black 30%, transparent 88%);
  pointer-events: none;
}

.hud-panel {
  position: absolute;
  right: 22px;
  top: 20px;
  z-index: 4;
  min-width: 238px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(147, 197, 253, 0.28);
  background: rgba(2, 10, 25, 0.58);
  backdrop-filter: blur(8px);
  box-shadow: 0 0 30px rgba(37, 99, 235, 0.2);
}

.hud-panel h2 {
  margin: 0 0 10px;
  font-size: 13px;
  letter-spacing: 0.12em;
  color: #bfdbfe;
  text-transform: uppercase;
}

.hud-panel p {
  margin: 6px 0;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: #dbeafe;
}

.hud-panel span {
  opacity: 0.74;
}

.title-wrap {
  position: absolute;
  left: 50%;
  top: 72%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.title {
  margin: 0;
  font-size: clamp(32px, 5.8vw, 76px);
  letter-spacing: 0.08em;
  color: #e2e8f0;
  text-shadow:
    0 0 14px rgba(147, 197, 253, 0.75),
    0 0 26px rgba(59, 130, 246, 0.55),
    0 0 42px rgba(37, 99, 235, 0.36);
}

.click-burst {
  position: absolute;
  z-index: 2;
  width: 14px;
  height: 14px;
  border: 1.5px solid rgba(147, 197, 253, 0.6);
  border-radius: 999px;
  pointer-events: none;
  transform: translate(-50%, -50%) scale(0.2);
  box-shadow:
    0 0 10px rgba(96, 165, 250, 0.45),
    0 0 18px rgba(59, 130, 246, 0.24);
  animation: clickBurst 480ms ease-out forwards;
}

@keyframes clickBurst {
  0% {
    opacity: 0.7;
    transform: translate(-50%, -50%) scale(0.2);
  }
  60% {
    opacity: 0.34;
    transform: translate(-50%, -50%) scale(2.6);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(3.1);
  }
}
</style>
