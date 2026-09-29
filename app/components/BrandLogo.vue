<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'auto' | 'dark' | 'light'; decorative?: boolean }>(), {
  tone: 'auto',
  decorative: false,
})
</script>
<template>
  <span
    class="brand-logo"
    :class="'brand-logo--' + tone"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : 'QRokê'"
    :aria-hidden="decorative || undefined"
  >
    <img
      class="brand-logo-dark"
      src="/brand/qroke-dark.png"
      alt=""
      width="2172"
      height="724"
      decoding="async"
    />
    <img
      class="brand-logo-light"
      src="/brand/qroke-light.png"
      alt=""
      width="2172"
      height="724"
      decoding="async"
    />
  </span>
</template>
<style scoped>
.brand-logo {
  display: inline-block;
  width: var(--brand-logo-width, 220px);
  max-width: 100%;
  aspect-ratio: 3;
  line-height: 0;
  vertical-align: middle;
  flex-shrink: 0;
}
.brand-logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.brand-logo .brand-logo-dark {
  display: block;
}
.brand-logo .brand-logo-light {
  display: none;
}
:global([data-theme='light'] .brand-logo--auto .brand-logo-dark),
.brand-logo--light .brand-logo-dark {
  display: none;
}
:global([data-theme='light'] .brand-logo--auto .brand-logo-light),
.brand-logo--light .brand-logo-light {
  display: block;
}
</style>
