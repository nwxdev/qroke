import { chromium, expect } from '@playwright/test'
import { createClient } from 'redis'
import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3281, {
  NUXT_ACCESS_REQUIRED: 'true',
  NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3281',
  NUXT_YOUTUBE_API_KEY: 'fixture-key',
  NODE_OPTIONS:
    '--import=' + new URL('../tests/helpers/youtube-fetch.mjs', import.meta.url).pathname,
})
const redis = await createClient({
  url: process.env.QROKE_DRAGONFLY_URL || 'redis://127.0.0.1:36379',
}).connect()
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const keys = []
try {
  await mkdir('test-results', { recursive: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(fixture.base + '/criar-festa')
  await expect(page.locator('input[type=password]')).toHaveCount(0)
  await page.getByLabel('Nome da festa', { exact: true }).fill('Melhorias da festa')
  await page.getByLabel('Seu nome', { exact: true }).fill('Ana')
  await page.getByRole('button', { name: 'Começar a festa', exact: true }).click()
  await expect(page).toHaveURL(/\/f\/[^/]+\/host$/)
  const id = new URL(page.url()).pathname.split('/')[2],
    api = fixture.base + '/api/f/' + id
  await expect(page.getByRole('heading', { name: 'Fila da festa', exact: true })).toBeVisible()
  await expect(page.locator('.admin-dialog[open]')).toHaveCount(0)
  const tabs = page.getByRole('navigation', { name: 'Gerenciar festa' })
  const mobile = await tabs.boundingBox()
  expect(mobile.y + mobile.height).toBeCloseTo(844, 0)
  await tabs.getByRole('button', { name: 'Dispositivos', exact: true }).click()
  await expect(page.locator('.managed-device')).toContainText('Ana')
  await expect(page.locator('.managed-device time')).toContainText('Conectado em')
  await page.screenshot({ path: 'test-results/party-devices-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  const desktop = await tabs.boundingBox(),
    panel = await page.locator('.device-panel').boundingBox()
  expect(desktop.x + desktop.width).toBeLessThan(panel.x)
  await page.screenshot({ path: 'test-results/party-devices-desktop.png', fullPage: true })
  await tabs.getByRole('button', { name: 'Player', exact: true }).click()
  await expect(page.getByText('Dono da festa', { exact: true })).toBeVisible()
  await tabs.getByRole('button', { name: 'Festa', exact: true }).click()
  await page.getByRole('button', { name: 'Encerrar festa', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Encerrar Melhorias da festa?' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar festa', exact: true }).click()
  await page
    .locator('.host-workspace')
    .getByText('Vincular esta sessão ao aplicativo', { exact: true })
    .click()
  await page
    .locator('.host-workspace')
    .getByRole('button', { name: 'Gerar código de vinculação' })
    .click()
  const code = await page.locator('.host-workspace').getByLabel('Código de vinculação').inputValue()
  const installed = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const app = await installed.newPage()
  await app.goto(fixture.base + '/vincular')
  await app.getByLabel('Código de vinculação').fill(code)
  await app.getByRole('button', { name: 'Retomar sessão', exact: true }).click()
  await expect(app).toHaveURL(fixture.base + '/f/' + id + '/host')
  expect((await (await installed.request.get(api + '/session')).json()).role).toBe('owner')
  await page.goto(fixture.base + '/f/' + id + '/busca')
  const search = page.getByRole('combobox', { name: 'Buscar música', exact: true })
  const seed = async (query, values) => {
    const key =
      'qroke:suggestions:' +
      fixture.databaseName +
      ':BR:' +
      createHash('sha256').update(query).digest('hex')
    keys.push(key)
    await redis.set(key, JSON.stringify(values), { EX: 300 })
  }
  await seed('evid', ['evidências', 'evidências ao vivo'])
  await seed('karaoke evid', ['karaoke evidências', 'karaokê evidências'])
  await search.fill('evid')
  await expect(page.getByRole('option')).toHaveCount(2)
  await expect(search).toHaveAttribute('aria-expanded', 'true')
  await search.press('ArrowDown')
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true')
  await search.press('Escape')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await page.locator('.search-options .q-toggle').click()
  await search.focus()
  await search.fill('evid')
  await expect(page.getByRole('option')).toHaveCount(1)
  await expect(page.getByRole('option')).toContainText('evidências')
  await expect(page.getByRole('option')).toContainText('Karaokê')
  await search.press('ArrowDown')
  const response = page.waitForResponse((r) => r.url().includes('/media/youtube/search'))
  await search.press('Enter')
  const url = new URL((await response).url())
  expect(url.searchParams.get('q')).toBe('evidências')
  expect(url.searchParams.get('karaoke')).toBe('true')
  await page.screenshot({ path: 'test-results/party-search-desktop.png', fullPage: true })
  const playlists = page.locator('.youtube-playlists')
  await playlists.getByRole('textbox', { name: 'Link da playlist' }).fill('PLabcdefghijk')
  await playlists.getByRole('button', { name: 'Conferir', exact: true }).click()
  const preview = playlists.locator('.playlist-preview')
  await expect(preview.locator('.playlist-tracks li')).toHaveCount(2)
  const filter = preview.getByRole('searchbox')
  await filter.fill('Música 1')
  await expect(preview.locator('.playlist-tracks li')).toHaveCount(1)
  await filter.fill('não existe')
  await expect(preview).toContainText('Nenhuma música corresponde à busca')
  await filter.fill('')
  await expect(preview.locator('.playlist-tracks li')).toHaveCount(2)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/party-playlist-mobile.png', fullPage: true })
  expect(errors).toEqual([])
  console.log(
    'Melhorias: criação sem PIN, tabs mobile/desktop, dispositivos com nome/hora, confirmação, vinculação, sugestões/teclado/karaokê e filtro de playlist OK',
  )
} finally {
  if (keys.length) await redis.del(keys)
  await redis.quit()
  await browser.close()
  await fixture.close()
}
