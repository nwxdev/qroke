<script setup lang="ts">
import type { SiteGuide } from '#shared/site-content'
withDefaults(defineProps<{ guide: SiteGuide; showCta?: boolean }>(), { showCta: true })
</script>
<template>
  <div class="public-guide">
    <header>
      <PartyBrand public-page />
      <HeaderMenu public-page />
    </header>
    <main>
      <MotionReveal as="section" class="guide-intro">
        <span class="eyebrow">{{ guide.eyebrow }}</span>
        <h1>{{ guide.title }}</h1>
        <p>{{ guide.intro }}</p>
        <NuxtLink v-if="showCta" class="primary-button guide-cta" to="/criar-festa"
          >Criar minha festa <span aria-hidden="true">↗</span></NuxtLink
        >
      </MotionReveal>
      <div class="guide-sections">
        <slot>
          <section v-for="section in guide.sections" :key="section.title">
            <h2>{{ section.title }}</h2>
            <p>{{ section.text }}</p>
          </section>
        </slot>
      </div>
    </main>
    <PublicSiteLinks />
  </div>
</template>
<style scoped>
.public-guide {
  max-width: 1120px;
  margin: auto;
  padding: 32px 5% 56px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 28px;
}
.guide-preferences {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
header > a {
  min-width: 0;
}
header :deep(.brand-logo) {
  max-width: 100%;
}
@media (max-width: 420px) {
  header {
    gap: 12px;
  }
  header > a {
    max-width: 158px;
  }
}
.guide-intro {
  max-width: 800px;
  padding: 64px 0 40px;
}
h1 {
  font-size: clamp(36px, 5vw, 62px);
  line-height: 1.08;
  letter-spacing: -0.035em;
  margin: 20px 0;
}
p {
  line-height: 1.75;
  font-size: 18px;
  color: var(--muted);
}
.guide-cta {
  display: inline-flex;
  gap: 24px;
  margin-top: 18px;
  padding: 14px 20px;
  border-radius: 14px;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
}
.guide-sections {
  max-width: 800px;
  display: grid;
  gap: 28px;
}
.guide-sections section {
  padding-top: 24px;
  border-top: 1px solid var(--line);
}
h2 {
  font-size: 25px;
  line-height: 1.3;
  margin: 0 0 12px;
}
</style>
