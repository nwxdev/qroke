import { chromium, expect } from '@playwright/test'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3183, {
  NODE_OPTIONS:
    '--import=' + new URL('../tests/helpers/youtube-fetch.mjs', import.meta.url).pathname,
  NUXT_YOUTUBE_API_KEY: 'fixture-key',
  NUXT_YOUTUBE_CLIENT_ID: 'fixture-client',
  NUXT_YOUTUBE_CLIENT_SECRET: 'fixture-secret',
  NUXT_YOUTUBE_REDIRECT_URI: 'http://127.0.0.1:3183/api/youtube/callback',
})
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.request.post(fixture.base + '/api/guest', { data: { name: 'Ana' } })
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(fixture.base)
  await page
    .getByLabel('Link da playlist', { exact: true })
    .fill('https://youtube.com/playlist?list=PLabcdefghijk')
  await page.getByLabel('Link da playlist', { exact: true }).press('Enter')
  const first = page.locator('.playlist-tracks li').first()
  await first.getByRole('button').click()
  await expect(first).toContainText('Na fila')
  await expect(first.getByRole('button')).toBeDisabled()
  await page.getByRole('button', { name: 'Adicionar 2 músicas', exact: true }).click()
  await expect(page.locator('.playlist-success')).toContainText('1 música(s)')
  const state = async () => await (await context.request.get(fixture.base + '/api/state')).json()
  let s = await state()
  expect(s.queue).toHaveLength(2)
  expect(s.queue.filter((t) => t.playlist)).toHaveLength(1)
  await expect(
    page
      .locator('.queue-card')
      .filter({ has: page.locator('.playlist-badge') })
      .locator('.queue-card-guest'),
  ).toHaveCount(0)
  await expect(page.locator('.queue-card-guest')).toHaveCount(1)
  await page.goto(fixture.base + '/qr')
  await expect(page).toHaveURL(fixture.base + '/player')
  await expect(page.locator('.player-playlist-card')).toHaveCount(1)
  await expect(page.locator('.player-queue-items > .queue-list .queue-row')).toHaveCount(1)
  await page.locator('.player-playlist-card summary').click()
  await expect(page.locator('.player-playlist-card .queue-row')).toHaveCount(1)
  await expect(page.locator('.player-playlist-card summary')).toContainText('Ana')
  await expect(page.locator('.player-playlist-card .queue-row')).not.toContainText('Ana')
  await expect(page.locator('.player-queue-items > .queue-list .queue-row')).toContainText('Ana')
  for (const width of [1440, 768, 360, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.locator('.qr-plate svg')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: 'test-results/player-playlist-card-mobile.png', fullPage: true })
  const start = await context.request.post(fixture.base + '/api/youtube/connect', { data: {} })
  const url = new URL((await start.json()).url)
  const callback = await context.request.get(
    fixture.base + '/api/youtube/callback?state=' + url.searchParams.get('state') + '&code=test',
  )
  expect(callback.status()).toBe(200)
  await page.goto(fixture.base)
  await page.getByRole('button', { name: 'Minha conta', exact: true }).click()
  await expect(page.locator('.account-playlists > li')).toHaveCount(1)
  const row = page.locator('.account-playlists > li').first()
  await row.locator('.playlist-result-actions > button').first().click()
  await expect(row.locator('.playlist-preview')).toBeVisible()
  await expect(row.getByRole('button', { name: 'Adicionadas à fila', exact: true })).toBeDisabled()
  for (const item of s.queue)
    expect(
      (
        await context.request.delete(fixture.base + '/api/queue/' + item.queueId, { data: {} })
      ).status(),
    ).toBe(200)
  await row
    .getByRole('button', { name: 'Adicionar todas de Playlist da festa', exact: true })
    .click()
  await expect(page.locator('.playlist-success')).toContainText('2 música(s)')
  s = await state()
  expect(s.queue).toHaveLength(2)
  expect(s.queue.every((t) => t.playlist?.title === 'Playlist da festa')).toBe(true)
  await row
    .getByRole('button', { name: 'Adicionar todas de Playlist da festa', exact: true })
    .click()
  await expect(page.locator('.playlist-success')).toContainText('0 música(s)')
  expect((await state()).queue).toHaveLength(2)
  expect(errors).toEqual([])
  console.log(
    'Playlists: faixa avulsa, todas com dedupe, expansão dentro da lista pessoal, botão playlist+ e card no player 320–1440px OK',
  )
} finally {
  await browser.close()
  await fixture.close()
}
