import { chromium, expect } from '@playwright/test'
import { openFixtureDatabase } from '../tests/helpers/database.mjs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3195)
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
const db = await openFixtureDatabase(fixture.dir)
try {
  const make = (index) => ({
    id: String(index).padStart(11, 'a'),
    source: 'youtube',
    title: 'Música da festa ' + index,
    artist: 'Artista ' + index,
    duration: 180,
    thumbnail: '',
    karaoke: false,
    queueId: randomUUID(),
    guestId: 'fixture',
    guestName: 'Convidado ' + index,
    origin: 'human',
    enqueuedAt: Date.now() + index,
    round: index,
    manualOrder: null,
  })
  const state = await db.readState()
  Object.assign(state, {
    current: make(0),
    playerId: 'fixture-player',
    paused: false,
    mode: 'music',
    queue: Array.from({ length: 8 }, (_, i) => make(i + 1)),
    revision: state.revision + 1,
  })
  await db.writeState(JSON.stringify(state))
  const guestContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await guestContext.request.post(fixture.base + '/api/guest', { data: { name: 'Visitante' } })
  const page = await guestContext.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(fixture.base)
  await expect(page.locator('.queue-card')).toHaveCount(8)
  const currentCard = page.locator('.queue-current-card')
  await expect(currentCard).toContainText('Tocando agora')
  await expect(currentCard).toContainText('Música da festa 0')
  await expect(currentCard).toContainText('Convidado 0')
  await expect(page.locator('.queue-rail > li').first()).toHaveClass('queue-current-card')
  await expect(page.locator('.queue-card .queue-number').first()).toHaveText('01')
  expect(
    await page.evaluate(() => {
      const rail = document.querySelector('.queue-rail').getBoundingClientRect()
      const cards = [...document.querySelectorAll('.queue-card, .queue-current-card')].map((el) =>
        el.getBoundingClientRect(),
      )
      return cards.filter((r) => r.left >= rail.left - 1 && r.right <= rail.right + 1).length
    }),
  ).toBe(4)
  expect(
    await page.evaluate(
      () =>
        document.querySelector('.search-section').getBoundingClientRect().bottom <
        document.querySelector('.queue-carousel').getBoundingClientRect().top,
    ),
  ).toBe(true)
  await page.screenshot({
    path: 'test-results/queue-current-desktop.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Ver próximas músicas' }).click()
  await expect
    .poll(async () => page.locator('.queue-rail').evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0)
  await page.screenshot({ path: 'test-results/queue-desktop.png', fullPage: true })
  await page.goto(fixture.base + '/qr')
  await expect(page.locator('.qr-queue .queue-row')).toHaveCount(8)
  expect(
    await page.evaluate(
      () =>
        document.querySelector('.qr-invite').getBoundingClientRect().bottom <=
        document.querySelector('.qr-queue').getBoundingClientRect().top,
    ),
  ).toBe(true)
  await page.screenshot({ path: 'test-results/qr-split-desktop.png', fullPage: true })
  for (const width of [768, 360, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.locator('.qr-plate svg')).toBeVisible()
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
    if (width <= 900)
      expect(
        await page.evaluate(
          () =>
            document.querySelector('.qr-queue').getBoundingClientRect().right <=
            document.querySelector('.qr-invite').getBoundingClientRect().left,
        ),
      ).toBe(true)
  }
  await page.setViewportSize({ width: 360, height: 800 })
  await page.screenshot({ path: 'test-results/qr-split-mobile.png', fullPage: true })
  await page.goto(fixture.base)
  await expect(page.locator('.queue-card')).toHaveCount(8)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(currentCard).toContainText('Tocando agora')
  await page.screenshot({
    path: 'test-results/queue-current-mobile.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.locator('.queue-rail').evaluate((el) => el.scrollTo({ left: el.scrollWidth }))
  await expect
    .poll(async () => page.locator('.queue-rail').evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0)
  await page.screenshot({ path: 'test-results/queue-mobile.png', fullPage: true })
  const initialCurrent = state.current
  const initialQueue = state.queue
  state.current = make(9)
  state.queue = []
  state.paused = true
  state.revision++
  await db.writeState(state)
  // A troca mantém o cartão anterior no DOM até terminar a animação de saída.
  await expect(currentCard).toHaveText([/Música da festa 9/], { timeout: 10000 })
  await expect(currentCard).toContainText('Em pausa')
  await expect(page.locator('.queue-card')).toHaveCount(0)
  await expect(page.locator('.queue-card-empty')).toBeVisible()
  state.playerId = null
  state.revision++
  await db.writeState(state)
  await expect(currentCard).toContainText('Aguardando reprodução', { timeout: 10000 })
  state.current = null
  state.revision++
  await db.writeState(state)
  await expect(currentCard).toHaveCount(0, { timeout: 10000 })
  state.current = initialCurrent
  state.queue = initialQueue
  state.paused = false
  state.revision++
  await db.writeState(state)
  console.log(
    'QR responsivo, música atual na fila com atualização e pausa, quatro cartões e scroll horizontal OK',
  )

  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await hostContext.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.qrokePauses=0; window.qrokePosition=10;
      window.YT={PlayerState:{ENDED:0},Player:class{
        constructor(node,options){this.events=options.events;this.frame=document.createElement('iframe');this.frame.title='Vídeo de teste';node.replaceWith(this.frame);window.qrokeFake=this;setTimeout(()=>this.events.onReady({target:this}),0)}
        getIframe(){return this.frame} getCurrentTime(){return window.qrokePosition} getDuration(){return 180}
        seekTo(value){window.qrokePosition=value} playVideo(){window.qrokePlaying=true}
        pauseVideo(){window.qrokePlaying=false;window.qrokePauses++} destroy(){this.frame.remove()}
      }};window.onYouTubeIframeAPIReady?.()`,
    }),
  )
  await hostContext.request.post(fixture.base + '/api/auth', {
    data: { action: 'login', pin: '4321' },
  })
  const host = await hostContext.newPage()
  host.on('pageerror', (e) => errors.push(e.message))
  await host.goto(fixture.base + '/host')
  await host.getByRole('button', { name: 'Tocar neste dispositivo', exact: true }).click()
  await expect.poll(async () => host.evaluate(() => window.qrokePlaying)).toBe(true)
  await host.locator('[data-player-stage]').scrollIntoViewIfNeeded()
  await expect(host.locator('.persistent-player.is-docked')).toHaveCount(0)
  await host.evaluate(() => {
    window.originalFrame = document.querySelector('iframe')
    window.originalPlayer = window.qrokeFake
    window.originalPauses = window.qrokePauses
  })
  for (const width of [1440, 360]) {
    await host.setViewportSize({ width, height: 800 })
    await host.evaluate(() => window.scrollTo(0, 0))
    await expect(host.locator('.persistent-player.is-docked')).toBeVisible()
    expect(
      await host.evaluate(() => ({
        sameFrame: window.originalFrame === document.querySelector('iframe'),
        samePlayer: window.originalPlayer === window.qrokeFake,
        playing: window.qrokePlaying,
        pausesAfterScroll: window.qrokePauses - window.originalPauses,
      })),
      'Reprodução durante scroll em ' + width + 'px',
    ).toEqual({ sameFrame: true, samePlayer: true, playing: true, pausesAfterScroll: 0 })
    const rect = await host.locator('iframe').boundingBox()
    expect(rect.width).toBeGreaterThanOrEqual(200)
    expect(rect.height).toBeGreaterThanOrEqual(200)
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.y).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(width)
    expect(rect.y + rect.height).toBeLessThanOrEqual(800)
    const controls = await host.locator('.persistent-controls').boundingBox()
    expect(controls.y).toBeGreaterThanOrEqual(rect.y + rect.height)
    await host.screenshot({
      path: 'test-results/player-floating-' + width + '.png',
      fullPage: false,
    })
    await host.getByRole('button', { name: 'Voltar ao player na página' }).click()
    await expect(host.locator('.persistent-player.is-docked')).toHaveCount(0)
    expect(
      await host.evaluate(
        () => window.qrokePlaying && window.originalFrame === document.querySelector('iframe'),
      ),
    ).toBe(true)
  }
  await db.expireAdmin()
  await expect(host.getByText('Admin liberado', { exact: true })).not.toBeVisible()
  await expect(host.getByRole('dialog')).not.toBeVisible()
  await expect(host).toHaveURL(fixture.base + '/busca')
  await expect.poll(async () => host.evaluate(() => window.qrokePlaying)).toBe(true)
  expect(errors).toEqual([])
  console.log(
    'Scroll mantém iframe/reprodução e mini player desktop/mobile; expiração redireciona o host para busca OK',
  )
} finally {
  await db.close()
  await browser.close()
  await fixture.close()
}
