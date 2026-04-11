<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps({
  mode: {
    type: String,
    default: 'idle'
  }
});

const hostEl = ref(null);
const useFallback = ref(false);

let renderer;
let scene;
let camera;
let resizeObserver;
let animationFrame = 0;
let orbGroup;
let particles;
let haloRing;
let labels = [];
let clock;
let energy = 0.35;
let targetEnergy = 0.35;
let THREERef = null;

const modeEnergy = {
  idle: 0.35,
  input: 0.55,
  detect: 0.7,
  morph: 0.85,
  cards: 0.62,
  cta: 0.48
};

const languageLabels = ['Hindi', 'Marathi', 'English', 'Spanish', 'Japanese', 'Arabic'];

const createTextSprite = (label, color) => {
  const THREE = THREERef;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '600 54px Inter, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowBlur = 18;
  context.shadowColor = color;
  context.fillStyle = '#eef7ff';
  context.fillText(label, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.82
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.9, 0.72, 1);
  return sprite;
};

const setupFallbackDecision = () => {
  useFallback.value = window.innerWidth < 768 || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const initScene = () => {
  const host = hostEl.value;
  const THREE = THREERef;
  if (!host || useFallback.value || !THREE) return;

  scene = new THREE.Scene();
  clock = new THREE.Clock();

  const width = host.clientWidth;
  const height = host.clientHeight;

  camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 0, 8.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0x80dfff, 1.2);
  const fill = new THREE.PointLight(0x534ab7, 18, 26, 1.5);
  fill.position.set(-4, 1, 6);
  const key = new THREE.PointLight(0x38bdf8, 24, 24, 1.2);
  key.position.set(3, 2, 5);
  scene.add(ambient, fill, key);

  orbGroup = new THREE.Group();

  const orbGeometry = new THREE.IcosahedronGeometry(1.24, 12);
  const orbMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x144c67,
    emissiveIntensity: 1.1,
    metalness: 0.28,
    roughness: 0.18,
    transparent: true,
    opacity: 0.9,
    transmission: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.14
  });
  const coreMesh = new THREE.Mesh(orbGeometry, orbMaterial);
  orbGroup.add(coreMesh);

  const wireGeometry = new THREE.TorusKnotGeometry(1.68, 0.045, 220, 18, 2, 3);
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0x7fdcff,
    transparent: true,
    opacity: 0.9
  });
  const wireMesh = new THREE.Mesh(wireGeometry, wireMaterial);
  wireMesh.rotation.x = Math.PI * 0.3;
  wireMesh.rotation.y = Math.PI * 0.18;
  orbGroup.add(wireMesh);

  const haloGeometry = new THREE.TorusGeometry(2.55, 0.035, 24, 180);
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0x534ab7,
    transparent: true,
    opacity: 0.64
  });
  haloRing = new THREE.Mesh(haloGeometry, haloMaterial);
  haloRing.rotation.x = Math.PI * 0.63;
  haloRing.rotation.y = Math.PI * 0.12;
  orbGroup.add(haloRing);

  scene.add(orbGroup);

  const particleCount = 900;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    const radius = 2.8 + Math.random() * 3.6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x8ddfff,
    size: 0.045,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  labels = languageLabels.map((label, index) => {
    const color = index % 2 === 0 ? '#38BDF8' : '#F2C98A';
    const sprite = createTextSprite(label, color);
    const angle = (index / languageLabels.length) * Math.PI * 2;
    const radius = 3.55 + (index % 2) * 0.9;
    sprite.position.set(Math.cos(angle) * radius, Math.sin(angle) * 1.6, Math.sin(angle) * radius * 0.32);
    scene.add(sprite);
    return sprite;
  });

  resizeObserver = new ResizeObserver(() => {
    if (!hostEl.value || !renderer || !camera) return;
    const nextWidth = hostEl.value.clientWidth;
    const nextHeight = hostEl.value.clientHeight;
    renderer.setSize(nextWidth, nextHeight);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(host);

  animate();
};

const animate = () => {
  animationFrame = window.requestAnimationFrame(animate);
  const THREE = THREERef;
  if (!renderer || !scene || !camera || !orbGroup || !particles || !haloRing || !clock) return;

  const elapsed = clock.getElapsedTime();
  energy += (targetEnergy - energy) * 0.045;

  orbGroup.rotation.y += 0.0024 + energy * 0.0036;
  orbGroup.rotation.x = Math.sin(elapsed * 0.4) * 0.14;
  orbGroup.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.025 + energy * 0.08);

  haloRing.rotation.z += 0.002 + energy * 0.002;
  haloRing.scale.setScalar(1 + energy * 0.1);

  particles.rotation.y += 0.0009 + energy * 0.0018;
  particles.rotation.x = Math.sin(elapsed * 0.16) * 0.25;
  particles.material.opacity = 0.42 + energy * 0.6;

  labels.forEach((label, index) => {
    const drift = elapsed * (0.18 + index * 0.01);
    label.position.y += Math.sin(drift + index) * 0.0018;
    label.position.x += Math.cos(drift * 0.8 + index) * 0.0016;
    label.material.opacity = 0.45 + Math.sin(elapsed * 0.8 + index) * 0.12 + energy * 0.28;
  });

  renderer.render(scene, camera);
};

const cleanup = () => {
  window.cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();

  labels.forEach((label) => {
    label.material.map?.dispose();
    label.material.dispose();
  });
  labels = [];

  if (particles) {
    particles.geometry.dispose();
    particles.material.dispose();
  }

  scene?.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((item) => item.dispose());
      } else {
        child.material.dispose();
      }
    }
  });

  renderer?.dispose();
  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  renderer = null;
  scene = null;
  camera = null;
  orbGroup = null;
  particles = null;
  haloRing = null;
  clock = null;
};

watch(
  () => props.mode,
  (value) => {
    targetEnergy = modeEnergy[value] ?? modeEnergy.idle;
  },
  { immediate: true }
);

onMounted(() => {
  setupFallbackDecision();
  if (!useFallback.value) {
    import('three').then((module) => {
      THREERef = module;
      initScene();
    });
  }
  window.addEventListener('resize', setupFallbackDecision);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', setupFallbackDecision);
  cleanup();
});
</script>

<template>
  <div class="orb-scene">
    <div ref="hostEl" class="orb-scene__canvas" :class="{ 'orb-scene__canvas--hidden': useFallback }"></div>
    <div v-if="useFallback" class="orb-scene__fallback">
      <div class="orb-scene__fallback-ring orb-scene__fallback-ring--outer"></div>
      <div class="orb-scene__fallback-ring orb-scene__fallback-ring--inner"></div>
      <div class="orb-scene__fallback-core"></div>
      <span v-for="label in languageLabels" :key="label" class="orb-scene__fallback-label">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.orb-scene {
  position: relative;
  width: 100%;
  height: 100%;
}

.orb-scene__canvas,
.orb-scene__fallback {
  position: absolute;
  inset: 0;
}

.orb-scene__canvas--hidden {
  display: none;
}

.orb-scene__fallback {
  display: grid;
  place-items: center;
  overflow: hidden;
}

.orb-scene__fallback-ring,
.orb-scene__fallback-core {
  position: absolute;
  border-radius: 999px;
}

.orb-scene__fallback-ring--outer {
  width: min(62vw, 320px);
  height: min(62vw, 320px);
  border: 1px solid rgba(56, 189, 248, 0.5);
  box-shadow: 0 0 36px rgba(56, 189, 248, 0.28);
  animation: fallback-spin 12s linear infinite;
}

.orb-scene__fallback-ring--inner {
  width: min(44vw, 220px);
  height: min(44vw, 220px);
  border: 1px solid rgba(83, 74, 183, 0.5);
  box-shadow: inset 0 0 28px rgba(83, 74, 183, 0.36);
  animation: fallback-breathe 4.2s ease-in-out infinite;
}

.orb-scene__fallback-core {
  width: min(22vw, 108px);
  height: min(22vw, 108px);
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.92), rgba(56, 189, 248, 0.28));
  box-shadow: 0 0 42px rgba(56, 189, 248, 0.36);
}

.orb-scene__fallback-label {
  position: absolute;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(237, 245, 255, 0.74);
}

.orb-scene__fallback-label:nth-child(4) { top: 14%; left: 14%; }
.orb-scene__fallback-label:nth-child(5) { top: 18%; right: 10%; }
.orb-scene__fallback-label:nth-child(6) { top: 48%; left: 10%; }
.orb-scene__fallback-label:nth-child(7) { top: 54%; right: 8%; }
.orb-scene__fallback-label:nth-child(8) { bottom: 18%; left: 18%; }
.orb-scene__fallback-label:nth-child(9) { bottom: 14%; right: 12%; }

@keyframes fallback-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fallback-breathe {
  0%, 100% { transform: scale(0.95); }
  50% { transform: scale(1.04); }
}
</style>
