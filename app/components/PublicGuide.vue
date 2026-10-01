<script setup lang="ts">
import type { SiteGuide } from '#shared/site-content'
defineProps<{ guide: SiteGuide }>()
</script>
<template>
  <div class="public-guide">
    <header>
      <NuxtLink to="/" aria-label="QRokê, início"><BrandLogo /></NuxtLink><ThemeToggle />
    </header>
    <main>
      <MotionReveal as="section" class="guide-intro">
        <span class="eyebrow">{{ guide.eyebrow }}</span>
        <h1>{{ guide.title }}</h1>
        <p>{{ guide.intro }}</p>
        <NuxtLink class="primary-button guide-cta" to="/#criar-festa"
          >Criar minha festa <span aria-hidden="true">↗</span></NuxtLink
        >
      </MotionReveal>
      <div class="guide-sections">
        <section v-for="section in guide.sections" :key="section.title">
          <h2>{{ section.title }}</h2>
          <p>{{ section.text }}</p>
        </section>
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
