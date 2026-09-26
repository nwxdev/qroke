<script setup lang="ts">
const { light, toggle } = useTheme()
</script>
<template>
  <button
    class="icon-button theme-toggle"
    :aria-label="light ? 'Usar tema escuro' : 'Usar tema claro'"
    @click="toggle"
  >
    {{ light ? '◐' : '☼' }}
  </button>
</template>
