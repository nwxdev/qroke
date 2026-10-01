import { chromium, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { createClient } from 'redis'
import { mkdir } from 'node:fs/promises'
import { startFixture } from '../tests/helpers/server.mjs'

const redisUrl = process.env.QROKE_DRAGONFLY_URL || 'redis://127.0.0.1:36379'
const fixture = await startFixture(3254, {
  NUXT_ACCESS_REQUIRED: 'true',
  NUXT_DRAGONFLY_URL: redisUrl,
})
const redis = await createClient({ url: redisUrl }).connect()
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
const keys = []
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const created = await context.request.post(fixture.base + '/api/parties', {
    data: { name: 'Busca YouTube', pin: '123456', idempotencyKey: crypto.randomUUID() },
  })
  expect(created.status()).toBe(201)
  const partyId = (await created.json()).party.id
  const api = fixture.base + '/api/f/' + partyId
  expect(
    (await context.request.post(api + '/guest', { data: { name: 'Teste de busca' } })).status(),
  ).toBe(200)
  expect(
    (
      await context.request.post(api + '/control', { data: { action: 'mode', mode: 'video' } })
    ).status(),
  ).toBe(200)
  const track = {
    id: 'aaaaaaaaaaa',
    source: 'youtube',
    title: 'CPM 22 - Resultado de teste',
    artist: 'Catálogo de teste',
    duration: 180,
    thumbnail: '',
    karaoke: false,
  }
  const prefix = 'qroke:catalog:' + fixture.databaseName + ':nwx:' + partyId + ':BR:'
  keys.push(
    prefix + 'search:' + createHash('sha256').update('cpm22:false').digest('hex'),
    prefix + 'track:' + track.id + ':false',
  )
  await redis.set(keys[0], JSON.stringify([track]), { EX: 300 })

  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(fixture.base + '/f/' + partyId + '/busca')
  const search = page.locator('.music-search')
  const input = search.getByRole('textbox', { name: 'Buscar música', exact: true })
  const submit = search.getByRole('button', { name: 'Buscar', exact: true })
  const results = search.locator('.results li')
  const alert = search.getByRole('alert')
  const searchPath = '/api/f/' + partyId + '/media/youtube/search'
  const nextResponse = () =>
    page.waitForResponse((response) => new URL(response.url()).pathname === searchPath)
  await input.fill('cpm22')

  // No API mock here: this must reach the compiled server's real scoped YouTube route.
  let pending = nextResponse()
  await submit.click()
  let response = await pending
  expect(response.status()).toBe(200)
  const query = new URL(response.url()).searchParams
  expect(query.get('q')).toBe('cpm22')
  expect(query.get('karaoke')).toBe('false')
  expect(query.get('channel')).toBe('video')
  expect((await response.json()).tracks[0].media.channel).toBe('video')
  await expect(results).toHaveCount(1)
  await expect(
    search.getByRole('button', { name: 'Adicionar ' + track.title + ' à fila', exact: true }),
  ).toBeEnabled()
  await expect(alert).toHaveCount(0)

  // Simulate only the API error response for the UI recovery scenario.
  const pattern = '**' + searchPath + '?*'
  const message =
    'A chave usa restrição de navegador. Configure uma chave para chamadas do servidor.'
  await context.route(pattern, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 503, statusMessage: message, message }),
    }),
  )
  pending = nextResponse()
  await submit.click()
  expect((await pending).status()).toBe(503)
  await expect(alert).toContainText(message)
  await expect(results).toHaveCount(0)
  await expect(search.locator('.empty-queue')).toHaveCount(0)
  await expect(search.locator('.search-status')).toHaveCount(0)
  const retry = search.getByRole('button', { name: 'Tentar busca novamente', exact: true })
  await expect(retry).toBeEnabled()
  await mkdir('test-results', { recursive: true })
  await page.screenshot({ path: 'test-results/youtube-search-error.png', fullPage: true })

  await context.unroute(pattern)
  pending = nextResponse()
  await retry.click()
  response = await pending
  expect(response.status()).toBe(200)
  await expect(alert).toHaveCount(0)
  await expect(results).toHaveCount(1)
  await expect(results).toContainText(track.title)
  await expect(submit).toBeEnabled()
  expect(errors).toEqual([])
  await page.screenshot({ path: 'test-results/youtube-search-recovered.png', fullPage: true })
  console.log(
    'Busca YouTube: rota real com cpm22/vídeo, erro 503 visível sem resultados antigos ou falso vazio, nova tentativa e recuperação OK.',
  )
} finally {
  await browser.close()
  if (keys.length) await redis.del(keys)
  await redis.quit()
  await fixture.close()
}
