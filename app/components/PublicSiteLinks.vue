<template>
  <footer class="public-footer">
    <strong>QRokê · A festa é de todo mundo.</strong>
    <nav aria-label="Conheça o QRokê">
      <NuxtLink to="/">Criar festa</NuxtLink>
      <NuxtLink to="/como-funciona">Como funciona</NuxtLink>
      <NuxtLink to="/karaoke-online">Karaokê online</NuxtLink>
      <NuxtLink to="/perguntas-frequentes">Perguntas frequentes</NuxtLink>
      <NuxtLink to="/mapa-do-site">Mapa do site</NuxtLink>
    </nav>
  </footer>
</template>
<style scoped>
.public-footer {
  border-top: 1px solid var(--line);
  padding-top: 28px;
  margin-top: 56px;
}
.public-footer strong {
  font-size: 14px;
}
.public-footer nav {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  margin-top: 18px;
}
.public-footer a {
  color: var(--text);
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
