process.env.NITRO_HOST ||= '0.0.0.0'
process.env.NITRO_PORT ||= process.env.QROKE_PORT || '3000'
process.env.NUXT_HOST_PIN ||= process.env.QROKE_HOST_PIN || ''
process.env.NUXT_YOUTUBE_API_KEY ||= process.env.YOUTUBE_API_KEY || ''
process.env.NUXT_MUSIC_DIR ||= process.env.QROKE_MUSIC_DIR || ''
process.env.NUXT_DATABASE ||= process.env.QROKE_DATABASE || '.data/qroke.sqlite'
process.env.NUXT_QUOTA_DAILY_CAP ||= process.env.QROKE_QUOTA_DAILY_CAP || '90'
process.env.NUXT_PUBLIC_PARTY_URL ||= process.env.QROKE_PUBLIC_URL || ''
process.env.NUXT_ADMIN_LEASE_SECONDS ||= process.env.QROKE_ADMIN_LEASE_SECONDS || '120'
process.env.NUXT_INVITE_ENV_FILE ??= process.env.QROKE_INVITE_ENV_FILE ?? '.env'
process.env.NUXT_YOUTUBE_CLIENT_ID ||= process.env.YOUTUBE_CLIENT_ID || ''
process.env.NUXT_YOUTUBE_CLIENT_SECRET ||= process.env.YOUTUBE_CLIENT_SECRET || ''
process.env.NUXT_YOUTUBE_REDIRECT_URI ||=
  process.env.YOUTUBE_REDIRECT_URI ||
  `http://localhost:${process.env.QROKE_PORT || 3000}/api/youtube/callback`
await import('../.output/server/index.mjs')
