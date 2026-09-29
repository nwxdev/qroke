<template>
  <header class="brand-header">
    <NuxtLink to="/busca" class="brand" aria-label="QRokê, início"
      ><BrandLogo decorative
    /></NuxtLink>
    <HeaderMenu
      ><template v-if="$slots.default" #default><slot /></template
    ></HeaderMenu>
  </header>
</template>
<style scoped>
.brand-header {
  container: party-header / inline-size;
  flex-wrap: nowrap;
  gap: 12px;
}
.brand-header .brand {
  min-width: 0;
}
@media (max-width: 380px) {
  .brand-header :deep(.brand-logo) {
    --brand-logo-width: 146px;
  }
}
</style>
