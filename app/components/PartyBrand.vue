<script setup lang="ts">
const props = withDefaults(defineProps<{ publicPage?: boolean; name?: string }>(), {
  publicPage: false,
})
const { state } = useParty()
const { id, href } = usePartyRoute()
const title = computed(
  () => props.name || (!props.publicPage && id.value ? state.value?.party?.name : '') || '',
)
</script>
<template>
  <NuxtLink
    :to="publicPage ? '/' : href('/busca')"
    class="party-brand"
    :aria-label="title ? 'QRokê · ' + title : 'QRokê, início'"
  >
    <span class="party-brand-mark"><BrandLogo decorative /></span>
    <span v-if="title" class="party-brand-name" :title="title">{{ title }}</span>
  </NuxtLink>
</template>
<style scoped>
.party-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  max-width: 100%;
  color: var(--text);
  text-decoration: none;
}
.party-brand-mark {
  display: block;
  width: 160px;
  flex-shrink: 0;
  line-height: 0;
  overflow: hidden;
}
.party-brand-mark :deep(.brand-logo) {
  --brand-logo-width: 160px;
  max-width: none;
}
.party-brand-name {
  min-width: 0;
  max-width: 220px;
  font-family: var(--font-reading);
  font-size: clamp(13px, 1.3vw, 17px);
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  border-left: 1px solid var(--line);
  padding-left: 14px;
}
@media (max-width: 1100px) {
  .party-brand-mark {
    width: 132px;
  }
  .party-brand-mark :deep(.brand-logo) {
    --brand-logo-width: 132px;
  }
  .party-brand-name {
    max-width: 180px;
  }
}
@media (max-width: 600px) {
  .party-brand {
    gap: 6px;
    flex: 1;
  }
  .party-brand-mark {
    width: 60px;
  }
  .party-brand-mark :deep(.brand-logo) {
    --brand-logo-width: 132px;
  }
  .party-brand-name {
    padding-left: 6px;
    max-width: none;
    font-size: 13px;
  }
}
</style>
