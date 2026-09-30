import { chromium, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { startFixture } from '../tests/helpers/server.mjs'
import { openFixtureDatabase } from '../tests/helpers/database.mjs'
const fixture = await startFixture(3232)
const db = await openFixtureDatabase(fixture.dir)
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
await mkdir('test-results', { recursive: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.request.post(fixture.base + '/api/auth', { data: { action: 'login', pin: '4321' } })
  await context.request.post(fixture.base + '/api/guest', { data: { name: 'Anfitrião' } })
  await context.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: [
        'window.qrokePosition=12;window.qrokePlaying=false;window.qrokeStarts=0;',
        'window.YT={PlayerState:{ENDED:0},Player:class{',
        'constructor(node,options){this.events=options.events;this.frame=document.createElement("iframe");this.frame.title="YouTube simulado";node.replaceWith(this.frame);window.qrokeFake=this;window.qrokeStarts++;setTimeout(()=>this.events.onReady({target:this}),0)}',
        'getIframe(){return this.frame} getCurrentTime(){return window.qrokePosition} getDuration(){return 180}',
        'seekTo(n){window.qrokePosition=n} playVideo(){window.qrokePlaying=true} pauseVideo(){window.qrokePlaying=false}',
        'destroy(){window.qrokePlaying=false;this.frame.remove()}}};window.onYouTubeIframeAPIReady?.()',
      ].join(''),
    }),
  )
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(fixture.base + '/host')
  await page.getByRole('button', { name: 'Tocar neste dispositivo', exact: true }).click()
  await expect(page.locator('[data-player-stage]')).toBeVisible()
  await expect.poll(async () => (await db.readState()).playerId).toBeTruthy()
  const state = await db.readState()
  const current = {
    id: 'abcdefghijk',
    source: 'youtube',
    title: 'Música contínua',
    artist: 'Artista',
    duration: 180,
    thumbnail: '',
    karaoke: false,
    queueId: randomUUID(),
    guestId: 'fixture',
    guestName: 'Anfitrião',
    origin: 'human',
    enqueuedAt: Date.now(),
    round: 0,
    manualOrder: null,
  }
  Object.assign(state, {
    current,
    queue: [],
    paused: false,
    position: 12,
    duration: 180,
    revision: state.revision + 1,
  })
  await db.writeState(state)
  await expect.poll(() => page.evaluate(() => window.qrokePlaying)).toBe(true)
  await page.evaluate(() => {
    window.originalFrame = document.querySelector('iframe')
    window.documentMarker = {}
  })
  for (const name of ['Player', 'Buscar músicas', 'Anfitrião', 'Player']) {
    await page.locator('header').getByRole('link', { name, exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.qrokePlaying)).toBe(true)
    expect(
      await page.evaluate(
        () =>
          window.originalFrame === document.querySelector('iframe') &&
          window.qrokeStarts === 1 &&
          !!window.documentMarker,
      ),
    ).toBe(true)
  }
  await page.getByRole('button', { name: 'Biblioteca local', exact: true }).click()
  await page.getByRole('textbox', { name: 'Buscar música', exact: true }).fill('Faixa')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.locator('.results li')).toHaveCount(7)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Menu da festa' })).toBeVisible()
  await expect(page.locator('.persistent-player.is-docked')).toBeVisible()
  expect(
    await page.evaluate(
      () => window.qrokePlaying && window.originalFrame === document.querySelector('iframe'),
    ),
  ).toBe(true)
  const video = await page.locator('iframe').boundingBox()
  expect(video.width).toBeGreaterThanOrEqual(200)
  expect(video.height).toBeGreaterThanOrEqual(200)
  expect(video.y + video.height).toBeLessThanOrEqual(844)
  await page.screenshot({ path: 'test-results/continuity-menu-mobile.png', animations: 'disabled' })
  await page.getByRole('button', { name: 'Fechar menu', exact: true }).click()
  await page.screenshot({ path: 'test-results/continuity-player-mobile.png', fullPage: true })
  // An empty upcoming queue retains a horizontally reachable search card.
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.locator('header').getByRole('link', { name: 'Buscar músicas', exact: true }).click()
  await page.setViewportSize({ width: 320, height: 740 })
  await page
    .locator('.queue-rail')
    .evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }))
  await expect
    .poll(() => page.locator('.queue-rail').evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0)
  await page.locator('.queue-card-empty').getByRole('link', { name: 'Buscar músicas' }).click()
  await expect(page.getByRole('textbox', { name: 'Buscar música', exact: true })).toBeFocused()
  expect(await page.evaluate(() => window.qrokeStarts)).toBe(1)
  // A second prepared screen takes over at the stopped position before the fallback timeout.
  const target = await context.newPage()
  target.on('pageerror', (error) => errors.push(error.message))
  await target.goto(fixture.base + '/player')
  await target.locator('.header-persistent .screen-sound-button').click()
  const device = await target.evaluate(() => JSON.parse(sessionStorage.getItem('qroke:device')))
  await page.evaluate(() => {
    window.qrokePosition = 48.75
  })
  const started = Date.now()
  await context.request.post(fixture.base + '/api/control', {
    data: { action: 'assign', deviceId: device.id },
  })
  await expect
    .poll(
      async () =>
        (await (await context.request.get(fixture.base + '/api/state')).json()).playerHandoff,
      { timeout: 7500 },
    )
    .toBeNull()
  await expect.poll(() => target.evaluate(() => window.qrokePlaying), { timeout: 7500 }).toBe(true)
  expect(Date.now() - started).toBeLessThan(9000)
  expect(await page.locator('iframe').count()).toBe(0)
  expect(await target.evaluate(() => window.qrokePosition)).toBe(48.75)
  await context.close()
  // A server-rendered name field must not accept typing before its handlers are ready.
  const cold = await browser.newContext()
  const coldPage = await cold.newPage()
  let releaseScripts
  const scriptsReady = new Promise((resolve) => {
    releaseScripts = resolve
  })
  await coldPage.route('**/_nuxt/*.js', async (route) => {
    await scriptsReady
    await route.continue()
  })
  try {
    await coldPage.goto(fixture.base + '/busca', { waitUntil: 'commit' })
    await expect(coldPage.getByLabel('Seu nome', { exact: true })).toBeDisabled()
  } finally {
    releaseScripts()
  }
  await expect(coldPage.getByLabel('Seu nome', { exact: true })).toBeEnabled()
  await coldPage.getByLabel('Seu nome', { exact: true }).fill('Primeiro acesso')
  await coldPage.getByRole('button', { name: 'Entrar na festa →', exact: true }).click()
  await expect(coldPage.getByRole('region', { name: 'Sua identidade na festa' })).toContainText(
    'Primeiro acesso',
  )
  await cold.close()
  const pwa = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const install = await pwa.newPage()
  await install.goto(fixture.base + '/entrar')
  await expect(install.getByRole('button', { name: 'Instalar QRokê' })).toBeVisible()
  await install.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    event.prompt = async () => {
      window.installRequested = true
      return { outcome: 'dismissed' }
    }
    window.dispatchEvent(event)
  })
  await install.getByRole('button', { name: 'Instalar QRokê' }).click()
  expect(await install.evaluate(() => window.installRequested)).toBe(true)
  const manifest = await (await pwa.request.get(fixture.base + '/site.webmanifest')).json()
  expect(manifest.display).toBe('standalone')
  await install.evaluate(() => navigator.serviceWorker.ready)
  await install.reload()
  await expect.poll(() => install.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  const cached = await install.evaluate(async () => {
    const cache = await caches.open('qroke-shell-v1')
    return (await cache.keys()).map((request) => new URL(request.url).pathname).sort()
  })
  expect(cached).toEqual(['/icon-192.png', '/icon-512.png', '/offline.html'])
  await pwa.setOffline(true)
  await install.goto(fixture.base + '/busca')
  await expect(install.getByRole('heading', { name: 'Sem conexão' })).toBeVisible()
  await install.screenshot({ path: 'test-results/pwa-offline-mobile.png' })
  expect(errors).toEqual([])
  await pwa.close()
  console.log(
    'PWA, offline privacy, persistent iframe through navigation/menus, mobile scroll and fast handoff OK',
  )
} finally {
  await browser.close()
  await db.close()
  await fixture.close()
}
