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
      src="/brand/qroke-dark-480-v1.webp"
      srcset="
        /brand/qroke-dark-240-v1.webp 240w,
        /brand/qroke-dark-480-v1.webp 480w,
        /brand/qroke-dark-720-v1.webp 720w
      "
      sizes="(max-width: 380px) 180px, 220px"
      alt=""
      width="720"
      height="240"
      decoding="async"
    />
    <img
      class="brand-logo-light"
      src="/brand/qroke-light-480-v1.webp"
      srcset="
        /brand/qroke-light-240-v1.webp 240w,
        /brand/qroke-light-480-v1.webp 480w,
        /brand/qroke-light-720-v1.webp 720w
      "
      sizes="(max-width: 380px) 180px, 220px"
      alt=""
      width="720"
      height="240"
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
  filter: var(--brand-filter-dark, none);
  display: block;
}
.brand-logo .brand-logo-light {
  filter: var(--brand-filter-light, none);
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
