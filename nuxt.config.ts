export default defineNuxtConfig({
  devtools: { enabled: false },
  compatibilityDate: '2026-09-01',
  modules: ['nuxt-quasar-ui'],
  css: ['~/assets/main.css', '~/assets/motion.css'],
  devServer: { host: '0.0.0.0', port: Number(process.env.QROKE_PORT || 3000) },
  nitro: { experimental: { websocket: true }, externals: { external: ['mongodb', 'redis'] } },
  runtimeConfig: {
    mongodbUri:
      process.env.QROKE_MONGODB_URI ||
      'mongodb://127.0.0.1:37017/?replicaSet=rs0&directConnection=true',
    mongodbDatabase: process.env.QROKE_MONGODB_DATABASE || 'qroke',
    dragonflyUrl: process.env.QROKE_DRAGONFLY_URL || 'redis://127.0.0.1:36379',
    organizationId: 'nwx',
    partyId: 'principal',
    accessRequired: process.env.QROKE_ACCESS_REQUIRED === 'true',
    trustProxy: process.env.QROKE_TRUST_PROXY === 'true',
    sessionSecret: process.env.QROKE_SESSION_SECRET || '',
    encryptionKey: process.env.QROKE_ENCRYPTION_KEY || '',

    youtubeRegion: process.env.QROKE_YOUTUBE_REGION || 'BR',
    youtubeApiKey: process.env.YOUTUBE_API_KEY || '',
    youtubeClientId: process.env.YOUTUBE_CLIENT_ID || '',
    youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    youtubeRedirectUri:
      process.env.YOUTUBE_REDIRECT_URI ||
      `http://localhost:${process.env.QROKE_PORT || 3000}/api/youtube/callback`,
    hostPin: process.env.QROKE_HOST_PIN || '',
    adminLeaseSeconds: Number(process.env.QROKE_ADMIN_LEASE_SECONDS || 120),
    inviteEnvFile: process.env.QROKE_INVITE_ENV_FILE ?? '.env',
    musicDir: process.env.QROKE_MUSIC_DIR || '',
    database: process.env.QROKE_DATABASE || '.data/qroke.sqlite',
    quotaDailyCap: Number(process.env.QROKE_QUOTA_DAILY_CAP || 90),
    public: {
      partyUrl: process.env.QROKE_PUBLIC_URL || '',
      gaMeasurementId: '',
    },
  },
  app: {
    head: {
      title: 'QRokê · A festa é de todo mundo',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { name: 'theme-color', content: '#101214' },
        { name: 'application-name', content: 'QRokê' },
        { name: 'apple-mobile-web-app-title', content: 'QRokê' },
      ],
      link: [
        {
          rel: 'preload',
          href: '/fonts/dm-sans-latin-v17.woff2',
          as: 'font',
          type: 'font/woff2',
          crossorigin: '',
        },
        {
          rel: 'preload',
          href: '/fonts/manrope-latin-v20.woff2',
          as: 'font',
          type: 'font/woff2',
          crossorigin: '',
        },

        { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon', sizes: '16x16 32x32 48x48' },
        { rel: 'icon', href: '/favicon-96.png', type: 'image/png', sizes: '96x96' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      script: [
        {
          innerHTML:
            "try{document.documentElement.dataset.theme=localStorage.getItem('qroke:theme:'+location.pathname)||'dark';document.documentElement.dataset.motion='on'}catch(e){}",
        },
      ],
    },
  },
  routeRules: {
    '/brand/**': { headers: { 'Cache-Control': 'public, max-age=604800' } },
    '/fonts/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
    '/sw.js': { headers: { 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' } },
    '/site.webmanifest': { headers: { 'Cache-Control': 'no-cache' } },
    '/f/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' } },
    '/entrar': {
      headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' },
    },
    '/brand/qroke-share-v2.jpg': { headers: { 'Cache-Control': 'public, max-age=86400' } },
    '/criar-festa': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/busca': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/host': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/player': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/qr': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/tv': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/api/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
    '/ws': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
  },
  quasar: { plugins: ['Dark'], lang: 'pt-BR', iconSet: 'svg-material-icons' },
})
