<template>
  <header class="brand-header">
    <PartyBrand class="brand" />
    <HeaderMenu
      ><template v-if="$slots.default" #default><slot /></template
    ></HeaderMenu>
  </header>
  <SonicThemeBanner />
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
</style>
