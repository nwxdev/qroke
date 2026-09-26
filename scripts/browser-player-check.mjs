import { chromium, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import { join } from 'node:path'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3199)
const browser = await chromium.launch({
  headless: true,
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
  args: ['--no-sandbox'],
})
const db = new Database(join(fixture.dir, 'party.sqlite'))
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await context.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
    window.qrokePosition=0
    window.YT={PlayerState:{ENDED:0},Player:class{
      constructor(node,options){
        this.events=options.events
        this.frame=document.createElement('iframe')
        this.frame.title='YouTube simulado'
        node.replaceWith(this.frame)
        window.qrokeFake=this
        setTimeout(()=>this.events.onReady({target:this}),0)
      }
      getIframe(){return this.frame}
      getCurrentTime(){return window.qrokePosition}
      getDuration(){return 30}
      seekTo(value){window.qrokePosition=value}
      playVideo(){window.qrokePlaying=true}
      pauseVideo(){window.qrokePlaying=false}
      destroy(){this.frame.remove()}
    }}
    window.onYouTubeIframeAPIReady?.()
  `,
    }),
  )
  await context.request.post(fixture.base + '/api/auth', { data: { action: 'login', pin: '4321' } })
  await page.goto(fixture.base + '/tv')
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('qroke:device')))
    .not.toBe(null)
  const device = await page.evaluate(() => JSON.parse(sessionStorage.getItem('qroke:device')))
  await context.request.post(fixture.base + '/api/control', {
    data: { action: 'assign', deviceId: device.id },
  })
  const make = (id, karaoke) => ({
    id,
    source: 'youtube',
    title: karaoke ? 'Karaokê de teste' : 'Vídeo seguinte',
    artist: 'Artista',
    duration: 30,
    thumbnail: '',
    karaoke,
    queueId: randomUUID(),
    guestId: 'test',
    guestName: 'Teste',
    origin: 'human',
    enqueuedAt: Date.now(),
    round: 0,
    manualOrder: null,
  })
  const first = make('aaaaaaaaaaa', true),
    second = make('bbbbbbbbbbb', false)
  const state = JSON.parse(db.prepare('SELECT state FROM party WHERE id=1').get().state)
  Object.assign(state, {
    current: first,
    queue: [second],
    paused: false,
    position: 0,
    duration: 30,
    revision: state.revision + 1,
  })
  db.prepare('UPDATE party SET state=? WHERE id=1').run(JSON.stringify(state))
  await expect(page.locator('iframe')).toBeVisible()
  await page.getByLabel('Ativar som', { exact: true }).click()
  await page.locator('iframe').scrollIntoViewIfNeeded()
  await expect.poll(() => page.evaluate(() => window.qrokePlaying)).toBe(true)
  await expect(page.locator('.tv-screen')).toHaveClass(/karaoke-expanded/)
  await expect(page.locator('.next-strip')).not.toBeVisible()
  await expect(page.locator('.karaoke-qr .qr-plate svg')).toBeVisible()
  await page.getByRole('button', { name: 'Controles', exact: true }).click()
  await expect(page.locator('.karaoke-qr .qr-plate svg')).toBeVisible()
  await page.getByRole('button', { name: 'Controles', exact: true }).click()
  for (const width of [360, 320]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(page.locator('.karaoke-qr .qr-plate svg')).toBeVisible()
    expect(
      await page.evaluate(() => {
        const a = document.querySelector('iframe').getBoundingClientRect()
        const b = document.querySelector('.karaoke-qr').getBoundingClientRect()
        return (
          b.left >= 0 &&
          b.right <= innerWidth &&
          b.bottom <= innerHeight &&
          !(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) &&
          document.documentElement.scrollWidth <= innerWidth
        )
      }),
    ).toBe(true)
    await page.screenshot({ path: 'test-results/karaoke-qr-' + width + '.png', fullPage: true })
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.evaluate(() => {
    window.qrokePosition = 26
  })
  await expect(page.locator('.next-strip')).toBeVisible({ timeout: 6000 })
  const rects = await page.evaluate(() => {
    const video = document.querySelector('iframe').getBoundingClientRect(),
      aside = document.querySelector('.tv-aside').getBoundingClientRect()
    return {
      video: {
        x: video.x,
        y: video.y,
        width: video.width,
        height: video.height,
        right: video.right,
      },
      aside: { x: aside.x, y: aside.y },
    }
  })
  expect(rects.video.width).toBeGreaterThanOrEqual(200)
  expect(rects.video.height).toBeGreaterThanOrEqual(200)
  expect(rects.video.right).toBeLessThanOrEqual(rects.aside.x)
  await page.screenshot({ path: 'test-results/tv-karaoke.png', fullPage: true })
  console.log(
    'YouTube simulado: ativação, mínimo 200px, karaokê e próximas nos 5s finais sem sobreposição OK',
  )
  await page.evaluate(() => window.qrokeFake.events.onError({ data: 150 }))
  await expect
    .poll(
      async () =>
        (await (await context.request.get(fixture.base + '/api/state')).json()).current?.id,
    )
    .toBe(second.id)
  await context.request.post(fixture.base + '/api/control', {
    data: { action: 'mode', mode: 'music' },
  })
  await expect(page.locator('.tv-screen')).toHaveClass(/music-mode/)
  const size = await page.locator('iframe').boundingBox()
  expect(size.width).toBeGreaterThanOrEqual(200)
  expect(size.width).toBeLessThanOrEqual(320)
  await page.getByRole('button', { name: 'Controles', exact: true }).click()
  await expect(page.locator('.tv-control-shelf')).toBeVisible()
  const overlap = await page.evaluate(() => {
    const a = document.querySelector('iframe').getBoundingClientRect(),
      b = document.querySelector('.tv-control-shelf').getBoundingClientRect()
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  })
  expect(overlap).toBe(false)
  await page.evaluate(() => window.qrokeFake.events.onStateChange({ data: 0 }))
  await expect
    .poll(
      async () => (await (await context.request.get(fixture.base + '/api/state')).json()).current,
    )
    .toBe(null)
  expect(errors).toEqual([])
  console.log(
    'YouTube simulado: erro 150 avança, modo música, controles fora do vídeo e fim de fila OK',
  )
} finally {
  db.close()
  await browser.close()
  await fixture.close()
}
