import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
export async function startFixture(port = 3197, extraEnv = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'qroke-test-')),
    music = join(dir, 'music')
  await mkdir(music)
  const samples = 8000 * Number(process.env.QROKE_TEST_TRACK_SECONDS || 2),
    wav = Buffer.alloc(44 + samples * 2)
  wav.write('RIFF')
  wav.writeUInt32LE(wav.length - 8, 4)
  wav.write('WAVE', 8)
  wav.write('fmt ', 12)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(8000, 24)
  wav.writeUInt32LE(16000, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(samples * 2, 40)
  for (let i = 0; i < samples; i++)
    wav.writeInt16LE(Math.round(Math.sin((i * 2 * Math.PI * 220) / 8000) * 500), 44 + i * 2)
  for (let i = 1; i <= 7; i++) await writeFile(join(music, 'Artista - Faixa ' + i + '.wav'), wav)
  let server,
    logs = ''
  const base = 'http://127.0.0.1:' + port
  async function start() {
    server = spawn(process.execPath, ['.output/server/index.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NITRO_HOST: '127.0.0.1',
        NITRO_PORT: String(port),
        NUXT_HOST_PIN: '4321',
        NUXT_DATABASE: join(dir, 'party.sqlite'),
        NUXT_MUSIC_DIR: music,
        NUXT_YOUTUBE_API_KEY: '',
        NUXT_YOUTUBE_CLIENT_ID: '',
        NUXT_YOUTUBE_CLIENT_SECRET: '',
        NUXT_YOUTUBE_REDIRECT_URI: '',
        NUXT_INVITE_ENV_FILE: '',
        ...extraEnv,
        NUXT_PUBLIC_PARTY_URL: 'http://192.0.2.10:' + port,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    server.stdout.on('data', (b) => {
      logs = (logs + b).slice(-12000)
    })
    server.stderr.on('data', (b) => {
      logs = (logs + b).slice(-12000)
    })
    for (let i = 0; i < 100; i++) {
      try {
        const r = await fetch(base + '/api/state')
        if (r.ok) return
      } catch {}
      if (server.exitCode !== null) throw new Error(logs)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error('Servidor não iniciou: ' + logs)
  }
  async function stop() {
    if (server && server.exitCode === null) {
      server.kill('SIGTERM')
      await once(server, 'exit')
    }
  }
  await start()
  return {
    base,
    dir,
    logs: () => logs,
    restart: async () => {
      await stop()
      await start()
    },
    close: async () => {
      await stop()
      if (!dir.startsWith(join(tmpdir(), 'qroke-test-'))) throw new Error('Invalid temporary path')
      await rm(dir, { recursive: true, force: true })
    },
  }
}
export function client(base) {
  let cookie = ''
  return {
    async request(path, body, method = body === undefined ? 'GET' : 'POST', headers = {}) {
      const response = await fetch(base + path, {
        method,
        headers: {
          cookie,
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const cookies = response.headers.getSetCookie()
      for (const value of cookies) {
        const part = value.split(';')[0],
          name = part.split('=')[0]
        cookie = cookie
          .split('; ')
          .filter((s) => s && !s.startsWith(name + '='))
          .concat(part)
          .join('; ')
      }
      let data
      try {
        data = await response.json()
      } catch {
        data = null
      }
      return { status: response.status, data, headers: response.headers }
    },
  }
}
