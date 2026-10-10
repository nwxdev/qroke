<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    message?: string
    resetKey?: string | number
    role?: 'alert' | 'status'
    closeLabel?: string
  }>(),
  { role: 'alert', closeLabel: 'Fechar aviso' },
)
const emit = defineEmits<{ close: [] }>()
const closed = ref(false)
watch(
  () => [props.message, props.resetKey],
  () => {
    closed.value = false
  },
)
function close() {
  closed.value = true
  emit('close')
}
</script>
<template>
  <div v-if="!closed" class="notice dismissible-notice" :role="role">
    <div class="dismissible-content">
      <slot>{{ message }}</slot>
    </div>
    <button type="button" class="notice-close" :aria-label="closeLabel" @click="close">
      <AppIcon name="close" />
    </button>
  </div>
</template>
<style scoped>
.dismissible-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}
.dismissible-content {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.notice-close {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  padding: 0;
  margin: -8px -8px -8px 0;
  border: 0;
  background: transparent;
  color: var(--text);
}
</style>
