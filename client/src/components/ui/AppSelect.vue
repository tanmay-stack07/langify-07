<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean, null],
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: 'Select an option'
  },
  size: {
    type: String,
    default: 'md'
  }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const rootEl = ref(null);

const normalizedOptions = computed(() =>
  props.options.map((option) => {
    if (typeof option === 'object' && option !== null) {
      return {
        label: option.label ?? String(option.value ?? ''),
        value: option.value ?? option.label
      };
    }

    return {
      label: String(option),
      value: option
    };
  })
);

const selectedOption = computed(() =>
  normalizedOptions.value.find((option) => option.value === props.modelValue) || null
);

const triggerClasses = computed(() => ({
  'app-select__trigger--sm': props.size === 'sm',
  'app-select__trigger--md': props.size === 'md'
}));

const menuClasses = computed(() => ({
  'app-select__menu--sm': props.size === 'sm'
}));

const toggle = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
};

const close = () => {
  isOpen.value = false;
};

const selectOption = (value) => {
  emit('update:modelValue', value);
  close();
};

const handlePointerDown = (event) => {
  if (!rootEl.value?.contains(event.target)) {
    close();
  }
};

const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    close();
  }
};

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown);
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div ref="rootEl" class="app-select" :class="{ 'app-select--open': isOpen, 'app-select--disabled': disabled }">
    <button type="button" class="app-select__trigger" :class="triggerClasses" :disabled="disabled" @click="toggle">
      <span class="app-select__value">{{ selectedOption?.label || placeholder }}</span>
      <span class="app-select__chevron">⌄</span>
    </button>

    <transition name="app-select-menu">
      <div v-if="isOpen" class="app-select__menu" :class="menuClasses">
        <button
          v-for="option in normalizedOptions"
          :key="String(option.value)"
          type="button"
          class="app-select__option"
          :class="{ 'app-select__option--active': modelValue === option.value }"
          @click="selectOption(option.value)"
        >
          <span>{{ option.label }}</span>
          <span v-if="modelValue === option.value" class="app-select__tick">•</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
}

.app-select__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.025)),
    radial-gradient(circle at 18% 20%, rgba(124, 212, 255, 0.12), transparent 38%);
  color: rgba(245, 247, 255, 0.96);
  text-align: left;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  transition: border-color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}

.app-select__trigger--md {
  padding: 0.95rem 1rem;
  font-size: 0.98rem;
}

.app-select__trigger--sm {
  padding: 0.72rem 0.9rem;
  font-size: 0.84rem;
  border-radius: 14px;
}

.app-select__trigger:hover:not(:disabled) {
  border-color: rgba(124, 212, 255, 0.2);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(124, 212, 255, 0.06);
  transform: translateY(-1px);
}

.app-select--open .app-select__trigger {
  border-color: rgba(124, 212, 255, 0.28);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(124, 212, 255, 0.08);
}

.app-select__trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-select__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-select__chevron {
  font-size: 1rem;
  line-height: 1;
  color: rgba(255, 255, 255, 0.72);
  transition: transform 0.22s ease;
}

.app-select--open .app-select__chevron {
  transform: rotate(180deg);
}

.app-select__menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 0.55rem);
  z-index: 60;
  display: grid;
  gap: 0.35rem;
  padding: 0.5rem;
  max-height: min(320px, 42vh);
  overflow-y: auto;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background:
    linear-gradient(180deg, rgba(18, 18, 31, 0.96), rgba(12, 11, 22, 0.94)),
    radial-gradient(circle at top, rgba(124, 212, 255, 0.08), transparent 42%);
  backdrop-filter: blur(20px);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.34);
  scrollbar-width: thin;
  scrollbar-color: rgba(124, 212, 255, 0.5) rgba(255, 255, 255, 0.04);
}

.app-select__menu--sm {
  border-radius: 16px;
}

.app-select__menu::-webkit-scrollbar {
  width: 8px;
}

.app-select__menu::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
}

.app-select__menu::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(124, 212, 255, 0.75), rgba(245, 193, 125, 0.55));
}

.app-select__menu::after {
  content: '';
  position: sticky;
  left: 0;
  right: 0;
  bottom: -0.5rem;
  display: block;
  height: 1.6rem;
  margin-top: -1.6rem;
  background: linear-gradient(180deg, rgba(12, 11, 22, 0), rgba(12, 11, 22, 0.95));
  pointer-events: none;
}

.app-select__option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.82rem 0.95rem;
  border-radius: 14px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(240, 243, 255, 0.84);
  text-align: left;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.app-select__option:hover {
  background: rgba(255, 255, 255, 0.055);
  border-color: rgba(255, 255, 255, 0.06);
  color: #fff;
  transform: translateX(2px);
}

.app-select__option--active {
  background: linear-gradient(90deg, rgba(124, 212, 255, 0.15), rgba(245, 193, 125, 0.12));
  border-color: rgba(124, 212, 255, 0.12);
  color: #fff;
}

.app-select__tick {
  color: #8de5ff;
  font-size: 1rem;
}

.app-select-menu-enter-active,
.app-select-menu-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.app-select-menu-enter-from,
.app-select-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>
