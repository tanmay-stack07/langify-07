<script setup>
import { ref } from 'vue';

const panelEl = ref(null);
const shineX = ref('50%');
const shineY = ref('50%');

const handleMove = (event) => {
  const panel = panelEl.value;
  if (!panel) return;

  const rect = panel.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const rotateY = ((x / rect.width) - 0.5) * 10;
  const rotateX = ((y / rect.height) - 0.5) * -10;

  shineX.value = `${(x / rect.width) * 100}%`;
  shineY.value = `${(y / rect.height) * 100}%`;
  panel.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
};

const resetTilt = () => {
  const panel = panelEl.value;
  if (!panel) return;
  panel.style.transform = '';
  shineX.value = '50%';
  shineY.value = '50%';
};
</script>

<template>
  <article
    ref="panelEl"
    class="tilt-panel"
    :style="{ '--shine-x': shineX, '--shine-y': shineY }"
    @mousemove="handleMove"
    @mouseleave="resetTilt"
  >
    <span class="tilt-panel__shine"></span>
    <div class="tilt-panel__body">
      <slot />
    </div>
  </article>
</template>

<style scoped>
.tilt-panel {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(11, 14, 24, 0.78);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  transform-style: preserve-3d;
  backdrop-filter: blur(24px);
}

.tilt-panel:hover {
  border-color: rgba(56, 189, 248, 0.28);
  box-shadow: 0 30px 90px rgba(4, 8, 20, 0.58);
}

.tilt-panel__shine {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at var(--shine-x) var(--shine-y), rgba(255, 255, 255, 0.18), transparent 32%),
    linear-gradient(135deg, rgba(56, 189, 248, 0.08), transparent 42%, rgba(242, 201, 138, 0.12));
  pointer-events: none;
}

.tilt-panel__body {
  position: relative;
  z-index: 1;
  height: 100%;
}
</style>
