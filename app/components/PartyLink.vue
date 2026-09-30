<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
const props = defineProps<{ to: RouteLocationRaw }>()
const { href } = usePartyRoute()
const target = computed(() => (typeof props.to === 'string' ? href(props.to) : props.to))
</script>
<template>
  <NuxtLink :to="target"><slot /></NuxtLink>
</template>
