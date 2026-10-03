import { execFileSync } from 'node:child_process'
import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { startFixture, client } from '../tests/helpers/server.mjs'
import { openFixtureDatabase } from '../tests/helpers/database.mjs'

const physical = !!process.env.QROKE_FIRETV_CDP
const live = process.env.QROKE_TV_LIVE_YOUTUBE === '1'
if (live && !physical) throw new Error('YouTube real requer QROKE_FIRETV_CDP para este roteiro.')
const fixture = await startFixture(3296, {
  NUXT_ACCESS_REQUIRED: 'true',
  NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3296',
  NUXT_YOUTUBE_API_KEY: 'fixture-key',
  NODE_OPTIONS:
    '--import=' + new URL('../tests/helpers/youtube-fetch.mjs', import.meta.url).pathname,
})
const database = await openFixtureDatabase(fixture.dir)
const browser = physical
  ? await chromium.connectOverCDP(process.env.QROKE_FIRETV_CDP)
  : await chromium.launch({
      headless: true,
      args: ['--no-sandbox'],
      ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
    })
const context = physical
  ? browser.contexts()[0]
  : await browser.newContext({ viewport: { width: 1280, height: 720 } })
const page = physical ? context.pages()[0] : await context.newPage()
const originalUrl = page.url()
const errors = []
const report = { physical, liveYoutube: live, checks: [] }
page.on('pageerror', (error) => errors.push(error.message))
try {
  if (!live)
    await page.route('https://www.youtube.com/iframe_api', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `
  window.YT={PlayerState:{ENDED:0},Player:class{
    constructor(node,o){this.events=o.events;this.frame=document.createElement('iframe');this.frame.title='YouTube simulado';node.replaceWith(this.frame);window.fake=this;setTimeout(()=>o.events.onReady({target:this}),0)}
    getIframe(){return this.frame}getCurrentTime(){return this.playing?(Date.now()-this.started)/1000:0}getDuration(){return 180}seekTo(){}playVideo(){if(!this.playing)this.started=Date.now();this.playing=true}pauseVideo(){this.playing=false}setVolume(v){this.volume=v}getVolume(){return this.volume||0}mute(){this.muted=true}unMute(){this.muted=false}isMuted(){return !!this.muted}destroy(){this.frame.remove()}
  }};window.onYouTubeIframeAPIReady?.()`,
      }),
    )
  const host = client(fixture.base)
  const created = await host.request('/api/parties', {
    name: 'Teste de usabilidade TV',
    pin: '123456',
    idempotencyKey: randomUUID(),
  })
  expect(created.status).toBe(201)
  const id = created.data.party.id,
    api = '/api/f/' + id
  await host.request(api + '/guest', { name: 'Teste QRokê' })
  const preview = await host.request(api + '/youtube/preview', {
    input: 'PLabcdefghijk',
    karaoke: true,
  })
  expect(preview.status).toBe(200)
  expect(
    (
      await host.request(api + '/youtube/import', {
        ticket: preview.data.ticket,
        videoId: 'aaaaaaaaaaa',
      })
    ).status,
  ).toBe(200)
  if (live) {
    const row = await database.db.collection('parties').findOne({ _id: 'nwx:' + id })
    row.state.queue[0].id = 'M7lc1UVf-VE'
    row.state.queue[0].title = 'Demonstração oficial do YouTube IFrame API'
    await database.db
      .collection('parties')
      .updateOne({ _id: row._id }, { $set: { state: row.state } })
  }
  await page.goto(fixture.base + '/tv')
  const field = page.getByLabel('Código de 4 caracteres', { exact: true })
  await expect(field).toBeVisible()
  if (physical && process.env.QROKE_FIRETV_ADB && process.env.QROKE_FIRETV_DEVICE) {
    const adb = (...args) =>
      execFileSync(process.env.QROKE_FIRETV_ADB, [
        '-s',
        process.env.QROKE_FIRETV_DEVICE,
        'shell',
        'input',
        ...args,
      ])
    await field.click()
    adb('text', 'ABCD')
    adb('keyevent', '67')
  } else {
    await field.fill('ABCD')
    await field.press('Backspace')
  }
  await expect(field).toHaveValue('ABC')
  await expect(field).toBeFocused()
  const code = await host.request(api + '/tv-code', {})
  expect(code.status, JSON.stringify(code.data)).toBe(200)
  if (physical && process.env.QROKE_FIRETV_ADB && process.env.QROKE_FIRETV_DEVICE) {
    const adb = (...args) =>
      execFileSync(process.env.QROKE_FIRETV_ADB, [
        '-s',
        process.env.QROKE_FIRETV_DEVICE,
        'shell',
        'input',
        ...args,
      ])
    for (let i = 0; i < 4; i++) adb('keyevent', '67')
    adb('text', code.data.code)
    adb('keyevent', '4')
    await expect(field).toHaveValue(code.data.code)
  } else await field.fill(code.data.code)
  await page.getByRole('button', { name: 'Conectar TV', exact: true }).click()
  await expect(page).toHaveURL(new RegExp('/f/' + id + '/player'))
  report.checks.push('Código de quatro caracteres conecta e seleciona a TV sem PIN administrativo')
  const countdown = page.locator('.karaoke-countdown')
  await expect(countdown).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.countdown-number')).toHaveText('10')
  await expect(countdown).toBeFocused()
  // Include the noninteractive iframe in hit testing: pointer-events:none alone can hide an overlap.
  expect(
    await page.evaluate(() => {
      const frame = document.querySelector('.persistent-player')
      const digit = document.querySelector('.countdown-number').getBoundingClientRect()
      const previous = frame.style.pointerEvents
      frame.style.pointerEvents = 'auto'
      const top = document.elementFromPoint(digit.x + digit.width / 2, digit.y + digit.height / 2)
      frame.style.pointerEvents = previous
      return !!top?.closest('.karaoke-countdown')
    }),
  ).toBe(true)
  await expect(page.locator('.karaoke-qr .qr-plate svg')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const animation = await countdown.evaluate((el) => ({
    name: getComputedStyle(el, '::before').animationName,
    before: getComputedStyle(el, '::before').transform,
  }))
  await page.waitForTimeout(900)
  const after = await countdown.evaluate((el) => getComputedStyle(el, '::before').transform)
  expect(animation.name).toMatch(/^countdown-atmosphere/)
  expect(after).not.toBe(animation.before)
  report.checks.push('Contagem recebe foco; atmosfera animada muda de posição no aparelho')
  await mkdir('test-results', { recursive: true })
  const prefix = physical ? 'firetv-silk' : 'tv-browser'
  await page.screenshot({ path: 'test-results/' + prefix + '-countdown.png' })
  await page.locator('.stage-actions .screen-sound-button').click()
  const state = async () => (await host.request(api + '/state')).data
  await expect.poll(async () => !!(await state()).karaokeStartsAt, { timeout: 30000 }).toBe(true)
  const start = await state()
  expect(start.position).toBe(0)
  expect(start.karaokeStartsAt - Date.now()).toBeGreaterThan(7000)
  await expect.poll(async () => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  await page.waitForTimeout(1500)
  expect((await state()).position).toBe(0)
  await expect(countdown).toBeVisible()
  report.checks.push('Som e fullscreen autorizados por um clique; vídeo aguarda a contagem')
  await expect(countdown).toHaveCount(0, { timeout: 20000 })
  await expect.poll(async () => (await state()).position, { timeout: 45000 }).toBeGreaterThan(1)
  const qr = await page.locator('.karaoke-qr .qr-plate').boundingBox()
  const video = await page.locator('.persistent-player').boundingBox()
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    ua: navigator.userAgent,
    fullscreen: !!document.fullscreenElement,
  }))
  expect(qr.x).toBeGreaterThan(dimensions.width * 0.75)
  expect(qr.y + qr.height).toBeLessThanOrEqual(dimensions.height)
  expect(qr.y + qr.height).toBeGreaterThan(dimensions.height * 0.85)
  expect(video).toEqual({ x: 0, y: 0, width: dimensions.width, height: dimensions.height })
  const iframe = await page.locator('.persistent-player iframe').boundingBox()
  expect(iframe).toEqual(video)
  await expect(page.locator('.persistent-player .persistent-controls')).toBeHidden()
  expect(
    await page.locator('.karaoke-qr .qr-plate').evaluate((el) => {
      const r = el.getBoundingClientRect()
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
    }),
  ).toBe(true)
  await page.screenshot({ path: 'test-results/' + prefix + '-playing.png' })
  report.dimensions = dimensions
  report.checks.push(
    'Vídeo ocupa toda a tela após a contagem; QR fica sobre o vídeo no canto inferior direito',
  )
  await page.getByRole('button', { name: 'Sair do palco', exact: true }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
  await expect(page.locator('.player-queue')).toBeVisible()
  expect(errors).toEqual([])
  report.checks.push('Saída do palco recupera os controles e a fila')
  await writeFile('test-results/' + prefix + '-report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  await mkdir('test-results', { recursive: true })
  await page
    .screenshot({
      path: 'test-results/' + (physical ? 'firetv-silk' : 'tv-browser') + '-failure.png',
    })
    .catch(() => {})
  console.error(
    'TV debug:',
    await page
      .locator('body')
      .innerText()
      .catch(() => ''),
    errors,
  )
  throw error
} finally {
  await page.unroute('https://www.youtube.com/iframe_api').catch(() => {})
  if (physical) {
    await page
      .evaluate(() => (document.fullscreenElement ? document.exitFullscreen() : undefined))
      .catch(() => {})
    await page.goto(originalUrl).catch(() => {})
  }
  await browser.close()
  await database.close()
  await fixture.close()
}
