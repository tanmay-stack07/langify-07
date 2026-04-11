<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'primary'
  }
});

const emit = defineEmits(['click']);

const buttonEl = ref(null);
const glowX = ref('50%');
const glowY = ref('50%');
const transformStyle = ref('');

const classes = computed(() => [
  'magnetic-button',
  props.variant === 'ghost' ? 'magnetic-button--ghost' : 'magnetic-button--primary'
]);

const handlePointerMove = (event) => {
  const button = buttonEl.value;
  if (!button) return;

  const rect = button.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  const xRatio = offsetX / rect.width - 0.5;
  const yRatio = offsetY / rect.height - 0.5;

  glowX.value = `${(offsetX / rect.width) * 100}%`;
  glowY.value = `${(offsetY / rect.height) * 100}%`;
  transformStyle.value = `translate3d(${xRatio * 10}px, ${yRatio * 10}px, 0) scale(1.02)`;
};

const resetMagnet = () => {
  transformStyle.value = '';
  glowX.value = '50%';
  glowY.value = '50%';
};
</script>

<template>
  <button
    ref="buttonEl"
    type="button"
    :class="classes"
    :style="{ transform: transformStyle, '--glow-x': glowX, '--glow-y': glowY }"
    @mousemove="handlePointerMove"
    @mouseleave="resetMagnet"
    @click="emit('click')"
  >
    <span class="magnetic-button__shine"></span>
    <span class="magnetic-button__label">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.magnetic-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 0.95rem 1.5rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #edf6ff;
  cursor: pointer;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
  will-change: transform;
  backdrop-filter: blur(20px);
}

.magnetic-button:hover {
  border-color: rgba(56, 189, 248, 0.5);
  box-shadow: 0 16px 42px rgba(11, 35, 68, 0.42);
}

.magnetic-button--primary {
  background:
    linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(83, 74, 183, 0.26) 52%, rgba(242, 201, 138, 0.24)),
    rgba(15, 17, 31, 0.82);
}

.magnetic-button--ghost {
  background: rgba(255, 255, 255, 0.03);
}

.magnetic-button__shine {
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background:
    radial-gradient(circle at var(--glow-x) var(--glow-y), rgba(255, 255, 255, 0.2), transparent 34%),
    linear-gradient(135deg, rgba(56, 189, 248, 0.08), transparent 38%, rgba(242, 201, 138, 0.12));
  opacity: 0.9;
  pointer-events: none;
}

.magnetic-button__label {
  position: relative;
  z-index: 1;
}
</style>
