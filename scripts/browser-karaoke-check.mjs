import { chromium, expect } from '@playwright/test'
import Database from 'better-sqlite3'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { startFixture, client } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3185, {
  NODE_OPTIONS:
    '--import=' + new URL('../tests/helpers/youtube-fetch.mjs', import.meta.url).pathname,
  NUXT_YOUTUBE_API_KEY: 'fixture-key',
})
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
const db = new Database(join(fixture.dir, 'party.sqlite'))
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  await context.addInitScript(() => {
    window.toneStarts = 0
    const original = AudioContext.prototype.createOscillator
    AudioContext.prototype.createOscillator = function (...args) {
      const node = original.apply(this, args),
        start = node.start.bind(node)
      node.start = (...values) => {
        window.toneStarts++
        return start(...values)
      }
      return node
    }
  })
  await context.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
 window.YT={PlayerState:{ENDED:0},Player:class{
 constructor(node,o){this.events=o.events;this.frame=document.createElement('iframe');this.frame.title='YouTube simulado';node.replaceWith(this.frame);window.fake=this;setTimeout(()=>this.events.onReady({target:this}),0)}
 getIframe(){return this.frame} getCurrentTime(){return 0} getDuration(){return 30} seekTo(){} playVideo(){this.playing=true} pauseVideo(){this.playing=false} setVolume(v){this.volume=v} getVolume(){return this.volume||0} mute(){this.muted=true} unMute(){this.muted=false} isMuted(){return !!this.muted} destroy(){this.playing=false;this.frame.remove()}
 }};window.onYouTubeIframeAPIReady?.()
 `,
    }),
  )
  await context.request.post(fixture.base + '/api/guest', { data: { name: 'Ana' } })
  const bia = client(fixture.base),
    caio = client(fixture.base)
  await bia.request('/api/guest', { name: 'Bia' })
  await caio.request('/api/guest', { name: 'Caio' })
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(fixture.base)
  await page.getByRole('link', { name: 'Buscar músicas', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Buscar música' })).toBeFocused()
  await page.locator('.youtube-playlists').getByLabel('Estas faixas são de karaokê').check()
  await page.locator('.youtube-playlists').getByLabel('Bia', { exact: true }).check()
  await page.locator('.youtube-playlists').getByLabel('Caio', { exact: true }).check()
  await page
    .getByLabel('Link da playlist', { exact: true })
    .fill('https://youtube.com/playlist?list=PLabcdefghijk')
  await page.getByLabel('Link da playlist', { exact: true }).press('Enter')
  await page.getByRole('button', { name: 'Adicionar 2 músicas', exact: true }).click()
  await expect(page.locator('.playlist-success')).toContainText('2 música(s)')
  const state = async () => await (await context.request.get(fixture.base + '/api/state')).json()
  expect((await state()).queue[0].singers.map((p) => p.name)).toEqual(['Ana', 'Bia', 'Caio'])
  await expect(page.locator('.queue-card').first()).toContainText('Ana · Bia · Caio')
  await context.request.post(fixture.base + '/api/auth', { data: { action: 'login', pin: '4321' } })
  await page.goto(fixture.base + '/tv')
  await expect(page).toHaveURL(fixture.base + '/player')
  const device = await page.evaluate(() => JSON.parse(sessionStorage.getItem('qroke:device')))
  await context.request.post(fixture.base + '/api/control', {
    data: { action: 'assign', deviceId: device.id },
  })
  await expect(page.locator('.karaoke-countdown')).toContainText('Ana · Bia · Caio')
  await expect(page.locator('.countdown-number')).toHaveText('5')
  await expect(page.locator('.player-karaoke-group')).toBeVisible()
  await expect(page.locator('.karaoke-queue-heading')).toContainText('prioridade agora')
  await expect(page.locator('.player-karaoke-group .player-playlist-card')).toHaveCount(1)
  await expect(page.locator('.karaoke-countdown')).toContainText('Aguardando o PLAYER')
  const countdown = page.locator('.karaoke-countdown')
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['dark', 'light']) {
      if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== theme)
        await page
          .getByRole('button', { name: theme === 'light' ? 'Usar tema claro' : 'Usar tema escuro' })
          .click()
      const bounds = await countdown.boundingBox()
      expect(bounds).toEqual({ x: 0, y: 0, width, height: 900 })
      const singers = await page.locator('.countdown-performers').boundingBox()
      const qr = await page.locator('.karaoke-qr').boundingBox()
      expect(singers.x + singers.width).toBeLessThanOrEqual(qr.x)
      await expect(page.locator('.countdown-song')).toHaveAccessibleName(
        (await state()).current.title,
      )
      await countdown.evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations({ subtree: true })
            .map((animation) => animation.finished.catch(() => {})),
        )
      })
      await page.screenshot({
        path: 'test-results/countdown-fullscreen-' + width + '-' + theme + '.png',
        fullPage: false,
      })
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await page
      .locator('.countdown-digit text')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.locator('.screen-sound-button').click()
  await expect.poll(async () => !!(await state()).karaokeStartsAt).toBe(true)
  await expect.poll(() => page.evaluate(() => window.toneStarts)).toBeGreaterThan(0)
  expect(await page.evaluate(() => !!window.fake.playing)).toBe(false)
  for (const width of [1440, 768, 360, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.locator('.karaoke-qr .qr-plate svg')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: 'test-results/karaoke-countdown-mobile.png', fullPage: true })
  await expect.poll(() => page.evaluate(() => !!window.fake.playing), { timeout: 10000 }).toBe(true)
  await expect(page.locator('.karaoke-countdown')).toHaveCount(0)
  const tones = await page.evaluate(() => window.toneStarts)
  await page.waitForTimeout(600)
  expect(await page.evaluate(() => window.toneStarts)).toBe(tones)
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 900 })
    const group = page.locator('.player-karaoke-group')
    await expect(group).toBeVisible()
    const playlist = group.locator('.player-playlist-card')
    if (!(await playlist.evaluate((element) => element.open)))
      await playlist.locator('summary').click()
    await expect(playlist.locator('.queue-row')).toContainText('Ana · Bia · Caio')
    const bounds = await group.boundingBox()
    const qr = await page.locator('.karaoke-qr').boundingBox()
    if (width < 1024) expect(bounds.x + bounds.width).toBeLessThanOrEqual(qr.x)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: 'test-results/karaoke-queue-' + width + '.png',
      fullPage: true,
    })
  }
  const host = await context.newPage()
  host.on('pageerror', (e) => errors.push(e.message))
  await host.goto(fixture.base + '/host')
  await host.getByLabel('Preparação do karaokê (segundos)').fill('2')
  await host.waitForTimeout(2300)
  await expect(host.getByLabel('Preparação do karaokê (segundos)')).toHaveValue('2')
  await host.getByRole('button', { name: 'Salvar karaokê', exact: true }).click()
  await expect.poll(async () => (await state()).karaokeDelaySeconds).toBe(2)
  await page.bringToFront()
  await page.evaluate(() => window.fake.events.onStateChange({ data: 0 }))
  await expect(page.locator('.countdown-number')).toHaveText('2')
  await expect.poll(() => page.evaluate(() => !!window.fake.playing), { timeout: 7000 }).toBe(true)
  await host.getByRole('button', { name: 'Sair do admin', exact: true }).click()
  await expect(host).toHaveURL(fixture.base + '/busca')
  await expect(page).toHaveURL(fixture.base + '/player')
  await page.bringToFront()
  await expect.poll(() => page.evaluate(() => !!window.fake.playing)).toBe(true)
  await expect(
    page.getByRole('button', { name: /Controles|Liberar controles|Sair do admin/ }),
  ).toHaveCount(0)
  // Regressão: um pedido de karaokê durante playlist comum já aparece como próximo.
  const background = await state()
  const regular = {
    ...background.current,
    id: 'yyyyyyyyyyy',
    queueId: randomUUID(),
    title: 'Playlist comum em execução',
    karaoke: false,
    singers: undefined,
    manualOrder: null,
    playlist: { id: 'PLbackground', title: 'Playlist de fundo' },
  }
  const following = {
    ...regular,
    id: 'zzzzzzzzzzz',
    queueId: randomUUID(),
    title: 'Depois do karaokê',
  }
  const saved = JSON.parse(db.prepare('SELECT state FROM party WHERE id=1').get().state)
  Object.assign(saved, {
    current: regular,
    queue: [following],
    mode: 'music',
    position: 0,
    karaokeLeadSeconds: 0,
    karaokeStartsAt: null,
    revision: saved.revision + 1,
  })
  db.prepare('UPDATE party SET state=? WHERE id=1').run(JSON.stringify(saved))
  await expect(page.locator('.tv-screen')).toHaveClass(/music-mode/)
  const preview = await (
    await context.request.post(fixture.base + '/api/youtube/preview', {
      data: { input: 'PLabcdefghijk', karaoke: true },
    })
  ).json()
  const imported = await context.request.post(fixture.base + '/api/youtube/import', {
    data: { ticket: preview.ticket, videoId: preview.tracks[0].id },
  })
  expect(imported.status()).toBe(200)
  expect((await state()).current.queueId).toBe(regular.queueId)
  await expect(page.locator('.player-queue-cards > :first-child')).toHaveClass(
    /player-karaoke-group/,
  )
  await expect(page.locator('.karaoke-queue-heading')).toContainText('prioridade agora')
  await expect(page.locator('.player-karaoke-group .queue-number')).toHaveText('01')
  await expect.poll(() => page.evaluate(() => !!window.fake.playing)).toBe(true)
  await page.evaluate(() => window.fake.events.onStateChange({ data: 0 }))
  await expect(page.locator('.countdown-number')).toHaveText('2')
  await expect.poll(async () => (await state()).current.id).toBe(preview.tracks[0].id)
  await expect.poll(() => page.evaluate(() => !!window.fake.playing), { timeout: 7000 }).toBe(true)
  await page.evaluate(() => window.fake.events.onStateChange({ data: 0 }))
  await expect.poll(async () => (await state()).current.queueId).toBe(following.queueId)
  expect((await state()).current.playlist.title).toBe('Playlist de fundo')
  expect(errors).toEqual([])
  console.log(
    'Karaokê: 3 cantores via playlist, entrada /tv→/player, contagem padrão/configurável, vinheta interrompida ao iniciar, QR 320–1440px, busca por alvo e administração restrita ao host e pedido de karaokê como próximo durante playlist comum OK',
  )
} finally {
  await browser.close()
  db.close()
  await fixture.close()
}
