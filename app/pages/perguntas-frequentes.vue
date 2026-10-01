<script setup lang="ts">
import { SITE_FAQ } from '#shared/site-content'
const guide = {
  eyebrow: 'BORA PREPARAR A FESTA',
  title: 'Dúvidas sobre o QRokê?',
  intro:
    'Encontre respostas sobre o acesso pelo QR Code, a fila de músicas, o som da festa e o karaokê.',
  sections: SITE_FAQ.map(({ question, answer }) => ({ title: question, text: answer })),
}
</script>
<template><PublicGuide :guide="guide" /></template>
