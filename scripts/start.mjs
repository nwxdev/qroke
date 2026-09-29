import { readFileSync } from 'node:fs'
const productionVariables = {
  QROKE_MONGODB_URI: 'NUXT_MONGODB_URI',
  QROKE_MONGODB_DATABASE: 'NUXT_MONGODB_DATABASE',
  QROKE_DRAGONFLY_URL: 'NUXT_DRAGONFLY_URL',
  QROKE_SESSION_SECRET: 'NUXT_SESSION_SECRET',
  QROKE_ENCRYPTION_KEY: 'NUXT_ENCRYPTION_KEY',
  QROKE_ACCESS_REQUIRED: 'NUXT_ACCESS_REQUIRED',
  QROKE_TRUST_PROXY: 'NUXT_TRUST_PROXY',
  QROKE_ORGANIZATION_ID: 'NUXT_ORGANIZATION_ID',
  QROKE_PARTY_ID: 'NUXT_PARTY_ID',
  QROKE_HOST_PIN: 'NUXT_HOST_PIN',
  YOUTUBE_API_KEY: 'NUXT_YOUTUBE_API_KEY',
  YOUTUBE_CLIENT_ID: 'NUXT_YOUTUBE_CLIENT_ID',
  YOUTUBE_CLIENT_SECRET: 'NUXT_YOUTUBE_CLIENT_SECRET',
}
if (process.env.QROKE_RUNTIME_CONFIG_FILE) {
  const values = JSON.parse(readFileSync(process.env.QROKE_RUNTIME_CONFIG_FILE, 'utf8'))
  for (const source of Object.keys(productionVariables))
    if (typeof values[source] === 'string') process.env[source] = values[source]
}
for (const [source, target] of Object.entries(productionVariables)) {
  const path = process.env[source + '_FILE']
  if (path) process.env[target] = readFileSync(path, 'utf8').trim()
  else if (process.env[source]) process.env[target] = process.env[source]
}
process.env.NITRO_HOST ||= '0.0.0.0'
process.env.NITRO_PORT ||= process.env.QROKE_PORT || '3000'
process.env.NUXT_HOST_PIN ||= process.env.QROKE_HOST_PIN || ''
process.env.NUXT_YOUTUBE_REGION ||= process.env.QROKE_YOUTUBE_REGION || 'BR'
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
