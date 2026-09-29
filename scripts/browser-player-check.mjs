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
  const toggle = page.getByRole('button', { name: 'Abrir menu', exact: true })
  const initialToggle = await toggle.boundingBox()
  const activation = page.locator('.header-persistent .screen-sound-button')
  await expect(activation).toBeVisible()
  await expect(activation).toContainText('Ativar som')
  expect((await page.locator('.player-header').boundingBox()).height).toBeLessThanOrEqual(80)
  await expect(page.locator('.tv-control-shelf, .admin-dialog')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /Liberar controles|Controles|Sair do admin/ }),
  ).toHaveCount(0)
  await activation.click()
  await expect(page.locator('.header-persistent .sound-status')).toContainText(
    'Aguardando o anfitrião',
  )
  await expect(activation).toContainText('Som autorizado')
  expect((await (await context.request.get(fixture.base + '/api/state')).json()).playerId).toBe(
    null,
  )
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
  await expect(page.locator('.header-persistent')).toHaveCount(0)
  await toggle.click()
  const menuSound = page.locator('.menu-actions .screen-sound-button')
  await expect(page.locator('.menu-actions .sound-status')).toHaveText('Som ativado nesta tela.')
  await expect(menuSound).toContainText('Som ativo')
  await expect(menuSound).toHaveClass(/is-active/)
  await page.keyboard.press('Escape')
  await page.evaluate(() => {
    window.originalFrame = document.querySelector('iframe')
  })
  await page.waitForTimeout(2300)
  expect(await page.evaluate(() => window.originalFrame === document.querySelector('iframe'))).toBe(
    true,
  )
  await page.locator('iframe').scrollIntoViewIfNeeded()
  await expect.poll(() => page.evaluate(() => window.qrokePlaying)).toBe(true)
  await expect(page.locator('.tv-screen')).toHaveClass(/karaoke-expanded/)
  await expect(page.locator('.next-strip')).not.toBeVisible()
  await expect(page.locator('.karaoke-qr .qr-plate svg')).toBeVisible()
  await toggle.focus()
  await page.keyboard.press('MediaTrackNext')
  await page.keyboard.press('MediaPlayPause')
  await page.keyboard.press('Escape')
  expect(
    (await (await context.request.get(fixture.base + '/api/state')).json()).current.queueId,
  ).toBe(first.queueId)
  expect((await (await context.request.get(fixture.base + '/api/state')).json()).paused).toBe(false)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  for (const width of [360, 320]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(page.locator('.karaoke-qr .qr-plate svg')).toBeVisible()
    const beforeScroll = await toggle.boundingBox()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const afterScroll = await toggle.boundingBox()
    expect(afterScroll.y).toBe(beforeScroll.y)
    expect(afterScroll.x).toBe(beforeScroll.x)
    await page.evaluate(() => window.scrollTo(0, 0))
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
    data: { action: 'mode', mode: 'video' },
  })
  await expect(page.locator('.tv-screen')).toHaveClass(/video-mode/)
  for (const [width, height] of [
    [1440, 900],
    [1280, 720],
    [1024, 600],
    [390, 844],
    [320, 720],
  ]) {
    await page.setViewportSize({ width, height })
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true)
    await expect(page.locator('.qr-plate svg')).toBeVisible()
    if (width >= 1024) {
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight))
        .toBe(true)
      const video = await page.locator('iframe').boundingBox()
      const invite = await page.locator('.player-invite').boundingBox()
      const qr = await page.locator('.qr-plate').boundingBox()
      expect(invite.x - (video.x + video.width)).toBeGreaterThanOrEqual(28)
      expect(video.y + video.height).toBeLessThanOrEqual(height)
      expect(qr.y + qr.height).toBeLessThanOrEqual(height)
      expect(video.height).toBeGreaterThanOrEqual(height >= 720 ? 280 : 200)
    } else {
      expect(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(
        true,
      )
      expect((await page.locator('.player-header').boundingBox()).height).toBeLessThanOrEqual(124)
    }
    await page.screenshot({
      path: 'test-results/player-window-video-' + width + '.png',
      fullPage: width < 1024,
    })
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await context.request.post(fixture.base + '/api/control', {
    data: { action: 'mode', mode: 'music' },
  })
  await expect(page.locator('.tv-screen')).toHaveClass(/music-mode/)
  const size = await page.locator('iframe').boundingBox()
  expect(size.width).toBeGreaterThanOrEqual(200)
  expect(size.width).toBeLessThanOrEqual(320)
  await expect(toggle).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight))
    .toBe(true)
  const musicToggle = await toggle.boundingBox()
  expect(musicToggle.x).toBe(initialToggle.x)
  expect(musicToggle.y).toBe(initialToggle.y)
  await expect(page.locator('.header-persistent')).toHaveCount(0)
  await toggle.click()
  await expect(menuSound).toContainText('Som ativo')
  await menuSound.click()
  await expect(page.getByRole('dialog', { name: 'Menu da festa' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.locator('.tv-control-shelf, .remove-button, .row-actions, .queue-vote'),
  ).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Pular|Tentar novamente/ })).toHaveCount(0)
  await page.evaluate(() => window.qrokeFake.events.onStateChange({ data: 0 }))
  await expect
    .poll(
      async () => (await (await context.request.get(fixture.base + '/api/state')).json()).current,
    )
    .toBe(null)
  expect(errors).toEqual([])
  console.log(
    'YouTube simulado: erro 150 avança, modo música, ativação no rodapé fixo, ausência de admin/atalhos e fim de fila OK',
  )
} finally {
  db.close()
  await browser.close()
  await fixture.close()
}
