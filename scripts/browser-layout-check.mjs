import { chromium, expect } from '@playwright/test'
import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3195)
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
const db = new Database(join(fixture.dir, 'party.sqlite'))
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
  const state = JSON.parse(db.prepare('SELECT state FROM party WHERE id=1').get().state)
  Object.assign(state, {
    current: make(0),
    mode: 'music',
    queue: Array.from({ length: 8 }, (_, i) => make(i + 1)),
    revision: state.revision + 1,
  })
  db.prepare('UPDATE party SET state=? WHERE id=1').run(JSON.stringify(state))
  const guestContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await guestContext.request.post(fixture.base + '/api/guest', { data: { name: 'Visitante' } })
  const page = await guestContext.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(fixture.base)
  await expect(page.locator('.queue-card')).toHaveCount(8)
  expect(
    await page.evaluate(() => {
      const rail = document.querySelector('.queue-rail').getBoundingClientRect()
      const cards = [...document.querySelectorAll('.queue-card')].map((el) =>
        el.getBoundingClientRect(),
      )
      return cards.filter((r) => r.left >= rail.left - 1 && r.right <= rail.right + 1).length
    }),
  ).toBe(4)
  expect(
    await page.evaluate(
      () =>
        document.querySelector('.queue-carousel').getBoundingClientRect().bottom <
        document.querySelector('.search-section').getBoundingClientRect().top,
    ),
  ).toBe(true)
  await page.getByRole('button', { name: 'Ver próximas músicas' }).click()
  await expect
    .poll(() => page.locator('.queue-rail').evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0)
  await page.screenshot({ path: 'test-results/queue-desktop.png', fullPage: true })
  await page.goto(fixture.base + '/qr')
  await expect(page.locator('.qr-queue .queue-row')).toHaveCount(8)
  expect(
    await page.evaluate(
      () =>
        document.querySelector('.qr-invite').getBoundingClientRect().right <
        document.querySelector('.qr-queue').getBoundingClientRect().left,
    ),
  ).toBe(true)
  await page.screenshot({ path: 'test-results/qr-split-desktop.png', fullPage: true })
  for (const width of [768, 360, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.locator('.qr-plate svg')).toBeVisible()
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
    if (width <= 760)
      expect(
        await page.evaluate(
          () =>
            document.querySelector('.qr-invite').getBoundingClientRect().bottom <
            document.querySelector('.qr-queue').getBoundingClientRect().top,
        ),
      ).toBe(true)
  }
  await page.setViewportSize({ width: 360, height: 800 })
  await page.screenshot({ path: 'test-results/qr-split-mobile.png', fullPage: true })
  await page.goto(fixture.base)
  await expect(page.locator('.queue-card')).toHaveCount(8)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.locator('.queue-rail').evaluate((el) => el.scrollTo({ left: el.scrollWidth }))
  await expect
    .poll(() => page.locator('.queue-rail').evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0)
  await page.screenshot({ path: 'test-results/queue-mobile.png', fullPage: true })
  console.log(
    'QR em duas colunas/empilhado, fila acima da busca, quatro cartões e scroll horizontal OK',
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
  await expect.poll(() => host.evaluate(() => window.qrokePlaying)).toBe(true)
  await host.locator('.media-slot').scrollIntoViewIfNeeded()
  await expect(host.locator('.player-floating')).toHaveCount(0)
  await host.evaluate(() => {
    window.originalFrame = document.querySelector('iframe')
    window.originalPlayer = window.qrokeFake
    window.originalPauses = window.qrokePauses
  })
  for (const width of [1440, 360]) {
    await host.setViewportSize({ width, height: 800 })
    await host.evaluate(() => window.scrollTo(0, 0))
    await expect(host.locator('.player-floating')).toBeVisible()
    expect(
      await host.evaluate(
        () =>
          window.originalFrame === document.querySelector('iframe') &&
          window.originalPlayer === window.qrokeFake &&
          window.qrokePlaying &&
          window.originalPauses === window.qrokePauses,
      ),
    ).toBe(true)
    const rect = await host.locator('iframe').boundingBox()
    expect(rect.width).toBeGreaterThanOrEqual(200)
    expect(rect.height).toBeGreaterThanOrEqual(200)
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.y).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(width)
    expect(rect.y + rect.height).toBeLessThanOrEqual(800)
    const controls = await host.locator('.floating-controls').boundingBox()
    expect(controls.y).toBeGreaterThanOrEqual(rect.y + rect.height)
    await host.screenshot({
      path: 'test-results/player-floating-' + width + '.png',
      fullPage: false,
    })
    await host.getByRole('button', { name: 'Voltar ao player na página' }).click()
    await expect(host.locator('.player-floating')).toHaveCount(0)
    expect(
      await host.evaluate(
        () => window.qrokePlaying && window.originalFrame === document.querySelector('iframe'),
      ),
    ).toBe(true)
  }
  db.prepare('UPDATE admins SET expires_at=0').run()
  await expect(host.getByText('Admin liberado', { exact: true })).not.toBeVisible()
  await expect(host.getByRole('dialog')).not.toBeVisible()
  expect(
    await host.evaluate(
      () => window.qrokePlaying && window.originalFrame === document.querySelector('iframe'),
    ),
  ).toBe(true)
  expect(errors).toEqual([])
  console.log(
    'Scroll para cima mantém iframe, instância e reprodução; mini player visível em desktop/mobile sem sobreposição dos controles OK',
  )
} finally {
  db.close()
  await browser.close()
  await fixture.close()
}
