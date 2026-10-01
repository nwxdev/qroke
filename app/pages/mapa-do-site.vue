<script setup lang="ts">
import { PUBLIC_PAGES } from '#shared/site'

const pages = Object.entries(PUBLIC_PAGES).filter(([path]) => path !== '/mapa-do-site')
const guide = {
  eyebrow: 'CONHEÇA O QROKÊ',
  title: 'Todas as páginas do QRokê.',
  intro:
    'Encontre o caminho para criar sua festa, entender os convites e preparar uma noite de karaokê com os amigos.',
  sections: [],
}
const formatDate = (date: string) => date.split('-').reverse().join('/')
</script>
<template>
  <PublicGuide :guide="guide">
    <nav aria-label="Mapa das páginas públicas" class="site-map">
      <article v-for="[path, page] in pages" :key="path">
        <h2>
          <NuxtLink :to="path">{{ page.label }} <span aria-hidden="true">↗</span></NuxtLink>
        </h2>
        <p>{{ page.description }}</p>
        <small
          >Atualizado em
          <time :datetime="page.lastModified">{{ formatDate(page.lastModified) }}</time></small
        >
      </article>
    </nav>
    <section class="map-note">
      <h2>Já recebeu um convite?</h2>
      <p>Abra o link ou leia o QR Code enviado pelo anfitrião para acessar a sua festa.</p>
      <a href="/sitemap.xml">Versão do mapa para buscadores (XML)</a>
    </section>
  </PublicGuide>
</template>
<style scoped>
.site-map {
  display: grid;
  gap: 20px;
}
article {
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--surface);
}
h2 {
  margin: 0 0 12px;
  font-size: clamp(22px, 3vw, 28px);
  line-height: 1.3;
}
h2 a {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 5px;
}
p {
  margin: 0 0 16px;
  line-height: 1.7;
  color: var(--muted);
}
small {
  color: var(--muted);
}
.map-note {
  padding-top: 28px;
  border-top: 1px solid var(--line);
}
.map-note a {
  color: var(--text);
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
