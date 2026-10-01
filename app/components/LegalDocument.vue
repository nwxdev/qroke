<script setup lang="ts">
import { LEGAL_UPDATED } from '#shared/legal'
const props = defineProps<{
  title: string
  intro: string
  sections: { id: string; title: string }[]
}>()
const guide = computed(() => ({
  eyebrow: 'TRANSPARÊNCIA NO QROKÊ',
  title: props.title,
  intro: props.intro,
  sections: [],
}))
</script>
<template>
  <PublicGuide :guide="guide" :show-cta="false">
    <div class="legal-document">
      <p class="legal-updated">
        Atualizado em
        <time :datetime="LEGAL_UPDATED">{{ LEGAL_UPDATED.split('-').reverse().join('/') }}</time
        >.
      </p>
      <LegalContact />
      <nav class="legal-index" aria-label="Nesta página">
        <strong>Nesta página</strong>
        <ol>
          <li v-for="section in sections" :key="section.id">
            <a :href="'#' + section.id">{{ section.title }}</a>
          </li>
        </ol>
      </nav>
      <slot />
    </div>
  </PublicGuide>
</template>
<style scoped>
.legal-document {
  min-width: 0;
  overflow-wrap: anywhere;
}
.legal-document :deep(section) {
  padding-top: 28px;
  margin-top: 32px;
  border-top: 1px solid var(--line);
  scroll-margin-top: 24px;
}
.legal-document :deep(h2) {
  font-size: clamp(22px, 3vw, 28px);
  line-height: 1.3;
  margin-bottom: 16px;
}
.legal-document :deep(p),
.legal-document :deep(li) {
  color: var(--muted);
  font-size: 16px;
  line-height: 1.8;
}
.legal-document :deep(p + p),
.legal-document :deep(ul),
.legal-document :deep(ol) {
  margin-top: 16px;
}
.legal-document :deep(ul),
.legal-document :deep(ol) {
  padding-left: 24px;
}
.legal-document :deep(li + li) {
  margin-top: 10px;
}
.legal-document :deep(a) {
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 4px;
}
.legal-document :deep(strong) {
  color: var(--text);
}
.legal-updated {
  margin-bottom: 16px;
}
.legal-index {
  margin-top: 24px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
}
.legal-index a {
  display: inline-block;
  padding-block: 6px;
}
@media print {
  .legal-index {
    display: none;
  }
}
</style>
