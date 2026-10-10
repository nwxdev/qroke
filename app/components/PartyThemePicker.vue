<script setup lang="ts">
import { PARTY_THEMES, type PartyTheme } from '#shared/themes'
withDefaults(defineProps<{ modelValue: PartyTheme; disabled?: boolean; label?: string }>(), {
  label: 'Visual da festa',
})
const emit = defineEmits<{ 'update:modelValue': [value: PartyTheme] }>()
const groupId = useId()
</script>
<template>
  <fieldset class="party-theme-picker" :disabled="disabled">
    <legend>{{ label }}</legend>
    <div class="theme-options">
      <label
        v-for="theme in PARTY_THEMES"
        :key="theme.id"
        class="theme-option"
        :class="{ selected: modelValue === theme.id }"
        :data-preview="theme.id"
      >
        <input
          type="radio"
          :name="groupId"
          :value="theme.id"
          :checked="modelValue === theme.id"
          @change="emit('update:modelValue', theme.id)"
        />
        <span class="theme-swatch" aria-hidden="true"
          ><i v-for="color in theme.colors" :key="color" :style="{ '--swatch': color }"
        /></span>
        <strong>{{ theme.name }}</strong
        ><small>{{ theme.description }}</small>
        <span v-if="modelValue === theme.id" class="theme-selected"
          ><AppIcon name="check" /> Selecionado</span
        >
      </label>
    </div>
  </fieldset>
</template>
<style scoped>
.party-theme-picker {
  margin: 20px 0;
  border: 0;
  padding: 0;
  min-width: 0;
}
legend {
  padding: 0 0 12px;
  font-weight: 700;
}
.theme-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 12px;
}
.theme-option {
  display: grid;
  gap: 8px;
  align-content: start;
  position: relative;
  padding: 16px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  border-radius: var(--radius-card);
  cursor: pointer;
}
.theme-option.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.theme-option:focus-within {
  outline: 3px solid var(--accent);
  outline-offset: 4px;
}
.theme-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.theme-option small {
  color: var(--muted);
  font-weight: 400;
  line-height: 1.5;
}
.theme-swatch {
  display: flex;
  gap: 6px;
}
.theme-swatch i {
  width: 28px;
  height: 28px;
  background: var(--swatch);
  border-radius: 50%;
  border: 1px solid #80808055;
}
.theme-selected {
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
</style>
