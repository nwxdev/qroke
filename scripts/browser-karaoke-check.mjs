import { chromium, expect } from '@playwright/test'
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
  await expect(page.locator('.karaoke-countdown')).toContainText('Aguardando o PLAYER')
  await page.getByLabel('Ativar som', { exact: true }).click()
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
  await page.getByRole('button', { name: 'Controles', exact: true }).click()
  await page.getByLabel('Preparação do karaokê (segundos)').fill('2')
  await page.getByRole('button', { name: 'Salvar karaokê', exact: true }).click()
  await expect.poll(async () => (await state()).karaokeDelaySeconds).toBe(2)
  await page.getByRole('button', { name: 'Controles', exact: true }).click()
  await page.evaluate(() => window.fake.events.onStateChange({ data: 0 }))
  await expect(page.locator('.countdown-number')).toHaveText('2')
  await expect.poll(() => page.evaluate(() => !!window.fake.playing), { timeout: 7000 }).toBe(true)
  await page.getByRole('button', { name: 'Sair do admin', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Liberar controles', exact: true })).toBeVisible()
  expect(errors).toEqual([])
  console.log(
    'Karaokê: 3 cantores via playlist, entrada /tv→/player, contagem padrão/configurável, vinheta interrompida ao iniciar, QR 320–1440px, busca por alvo e saída no topo OK',
  )
} finally {
  await browser.close()
  await fixture.close()
}
