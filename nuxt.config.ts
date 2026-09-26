export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  modules: ['nuxt-quasar-ui'],
  css: ['~/assets/main.css'],
  devServer: { host: '0.0.0.0', port: Number(process.env.QROKE_PORT || 3000) },
  nitro: { experimental: { websocket: true }, externals: { external: ['better-sqlite3'] } },
  runtimeConfig: {
    youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
    hostPin: process.env.QROKE_HOST_PIN || '',
    adminLeaseSeconds: Number(process.env.QROKE_ADMIN_LEASE_SECONDS || 120),
    musicDir: process.env.QROKE_MUSIC_DIR || '',
    database: process.env.QROKE_DATABASE || '.data/qroke.sqlite',
    quotaDailyCap: Number(process.env.QROKE_QUOTA_DAILY_CAP || 90),
    public: { partyUrl: process.env.QROKE_PUBLIC_URL || '' },
  },
  app: {
    head: {
      title: 'QRokê · A festa é de todo mundo',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [{ name: 'theme-color', content: '#101214' }],
      script: [
        {
          innerHTML:
            "try{document.documentElement.dataset.theme=localStorage.getItem('qroke:theme:'+location.pathname)||'dark'}catch(e){}",
        },
      ],
    },
  },
  quasar: { plugins: ['Dark'] },
})
