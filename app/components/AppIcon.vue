<script setup lang="ts">
defineProps<{
  name:
    | 'fullscreen'
    | 'fullscreen-exit'
    | 'sparkles'
    | 'warning'
    | 'refresh'
    | 'menu'
    | 'close'
    | 'arrow-right'
    | 'lock'
    | 'unlock'
    | 'qr'
    | 'sun'
    | 'moon'
    | 'plus'
    | 'check'
    | 'search'
    | 'play'
    | 'pause'
    | 'next'
    | 'previous'
    | 'exit'
    | 'like'
    | 'dislike'
    | 'vote'
    | 'person'
    | 'edit'
    | 'microphone'
    | 'volume'
    | 'muted'
    | 'tv'
    | 'playlist-plus'
    | 'expand'
    | 'playlist'
    | 'link'
}>()
const paths = {
  fullscreen: 'M8 3H3v5 M16 3h5v5 M21 16v5h-5 M3 16v5h5',
  'fullscreen-exit': 'M3 8h5V3 M16 3v5h5 M21 16h-5v5 M8 21v-5H3',
  sparkles: 'M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z M20 2v4 M18 4h4',
  warning: 'M12 3l10 18H2z M12 9v5 M12 17v1',
  refresh: 'M20 7v5h-5 M4 17v-5h5 M5 8a8 8 0 0 1 13-3l2 3 M4 16l2 3a8 8 0 0 0 13-3',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'M6 6l12 12 M18 6L6 18',
  'arrow-right': 'M4 12h16 M14 6l6 6-6 6',
  microphone: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0z M6 10v2a6 6 0 0 0 12 0v-2 M12 18v4 M8 22h8',
  'playlist-plus': 'M3 5h14 M3 10h14 M3 15h8 M17 14v8 M13 18h8',
  expand: 'M5 9l7 7 7-7',
  exit: 'M10 4H4v16h6 M14 8l4 4-4 4 M8 12h13',
  like: 'M7 10v11H3V10z M7 10l5-8h2v6h5a2 2 0 0 1 2 2l-2 9a2 2 0 0 1-2 2H7',
  dislike: 'M7 14V3H3v11z M7 14l5 8h2v-6h5a2 2 0 0 0 2-2l-2-9a2 2 0 0 0-2-2H7',
  volume: 'M3 9h4l5-5v16l-5-5H3z M16 8a6 6 0 0 1 0 8 M19 5a10 10 0 0 1 0 14',
  muted: 'M3 9h4l5-5v16l-5-5H3z M17 9l5 6 M22 9l-5 6',
  previous: 'M19 4L7 12l12 8z M4 4v16',
  vote: 'M12 20V4 M5 11l7-7 7 7',
  person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  edit: 'M14 5l5 5 M4 20l5-1L21 7l-4-4L5 15z',
  playlist: 'M4 5h13 M4 10h13 M4 15h7 M16 14l6 4-6 4z',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
  lock: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4 M12 15v2',
  unlock: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 7.5-2 M12 15v2',
  qr: 'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h2v2h-2z M21 14v4h-3v3 M12 3v3 M3 12h3 M12 10v4 M11 19v2 M21 21h-1',
  sun: 'M12 3V1 M12 23v-2 M3 12H1 M23 12h-2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  moon: 'M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13',
  plus: 'M12 5v14 M5 12h14',
  check: 'M5 12l4 4L19 6',
  search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0 M15 15l6 6',
  play: 'M7 4l14 8-14 8z',
  pause: 'M8 5v14 M16 5v14',
  next: 'M5 4l12 8-12 8z M20 4v16',
  tv: 'M3 7h18v14H3z M8 2l4 5 4-5',
}
</script>
<template>
  <svg
    class="app-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="paths[name]" />
  </svg>
</template>
