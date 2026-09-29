import { chromium, expect } from '@playwright/test'
import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3182)
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
const db = new Database(join(fixture.dir, 'party.sqlite'))
try {
  const context = await browser.newContext()
  const page = await context.newPage()
  await context.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
      window.YT={PlayerState:{ENDED:0},Player:class {
        constructor(node,options){this.events=options.events;this.frame=document.createElement('iframe');node.replaceWith(this.frame);window.fake=this;setTimeout(()=>this.events.onReady({target:this}),0)}
        getIframe(){return this.frame} getCurrentTime(){return 180} getDuration(){return 180}
        seekTo(){} playVideo(){this.playing=true} pauseVideo(){} setVolume(){} unMute(){} destroy(){this.frame.remove()}
      }};window.onYouTubeIframeAPIReady?.()
    `,
    }),
  )
  await context.request.post(fixture.base + '/api/auth', { data: { action: 'login', pin: '4321' } })
  await page.goto(fixture.base + '/player')
  await expect(page.locator('.header-persistent .screen-sound-button')).toBeEnabled()
  await page.locator('.header-persistent .screen-sound-button').click()
  const device = await page.evaluate(() => JSON.parse(sessionStorage.getItem('qroke:device')))
  await context.request.post(fixture.base + '/api/control', {
    data: { action: 'assign', deviceId: device.id },
  })
  const state = () => JSON.parse(db.prepare('SELECT state FROM party WHERE id=1').get().state)
  const track = {
    id: 'aaaaaaaaaaa',
    queueId: randomUUID(),
    source: 'youtube',
    title: 'Cantador de campanha',
    artist: 'Teste',
    duration: 180,
    thumbnail: '',
    karaoke: false,
    guestId: 'fixture',
    guestName: 'Teste',
    origin: 'human',
    enqueuedAt: Date.now(),
    round: 0,
    manualOrder: null,
  }
  db.prepare('UPDATE party SET state=? WHERE id=1').run(
    JSON.stringify({
      ...state(),
      current: track,
      queue: [],
      duration: 180,
      revision: state().revision + 1,
    }),
  )
  await expect(page.locator('iframe')).toBeVisible()
  await expect.poll(() => page.evaluate(() => !!window.fake?.playing)).toBe(true)
  let blocked = true,
    endings = 0
  await context.route('**/api/player', async (route) => {
    if (route.request().postDataJSON()?.action === 'ended') {
      endings++
      if (blocked) return route.abort('failed')
    }
    await route.continue()
  })
  await page.evaluate(() => window.fake.events.onStateChange({ data: 0 }))
  await expect.poll(() => endings).toBeGreaterThan(0)
  expect(state().current.queueId).toBe(track.queueId)
  const notice = page.locator('.media-alert')
  await expect(notice).toBeVisible()
  expect(await page.locator('.party-alerts').evaluate((el) => getComputedStyle(el).position)).toBe(
    'fixed',
  )
  for (const theme of ['dark', 'light']) {
    if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== theme)
      await page
        .getByRole('button', { name: theme === 'light' ? 'Usar tema claro' : 'Usar tema escuro' })
        .click()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(notice).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const logo = page.locator('.player-brand .brand-logo-' + theme)
    await expect.poll(() => logo.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true)
    await expect(notice.getByRole('button', { name: 'Tentar novamente', exact: true })).toHaveCSS(
      'background-color',
      theme === 'light' ? 'rgb(233, 235, 227)' : 'rgb(34, 38, 42)',
    )
    await page.screenshot({ path: 'test-results/notice-retry-' + theme + '.png' })
  }
  blocked = false
  await notice.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect.poll(() => state().current, { timeout: 6000 }).toBe(null)
  expect(state().history.filter((t) => t.queueId === track.queueId)).toHaveLength(1)
  await expect(
    page.getByText('Sem conexão com o servidor. Reconectando…', { exact: true }),
  ).toBeHidden()
  console.log(
    'Fim do YouTube durante falha de rede é reenviado e libera a faixa, sem avanço duplicado OK',
  )

  await context.request.post(fixture.base + '/api/guest', { data: { name: 'Ana' } })
  const guest = await context.newPage()
  await guest.goto(fixture.base + '/busca')
  await guest.getByRole('button', { name: 'Biblioteca local', exact: true }).click()
  await guest.getByRole('textbox', { name: 'Buscar música', exact: true }).fill('Faixa 1')
  await guest.getByRole('textbox', { name: 'Buscar música', exact: true }).press('Enter')
  const add = guest.getByLabel('Adicionar Faixa 1 à fila')
  await add.click()
  await expect(add).toBeDisabled()
  await expect.poll(() => state().current).toBe(null)
  await expect(add).toBeEnabled()
  await add.click()
  await expect(add).toBeDisabled()
  await expect.poll(() => state().current).toBe(null)
  expect(
    state().history.filter((t) => t.title === 'Faixa 1' && t.outcome === 'ended'),
  ).toHaveLength(2)
  let stateOffline = true
  await context.route('**/api/state', async (route) => {
    if (stateOffline) return route.abort('failed')
    await route.continue()
  })
  const offlineNotice = page.locator('.connection-alert')
  await expect(offlineNotice).toBeVisible({ timeout: 7000 })
  stateOffline = false
  await offlineNotice.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(offlineNotice).toBeHidden()
  console.log(
    'Música concluída pode ser adicionada novamente pelos mesmos resultados; histórico não bloqueia pedido humano OK',
  )
} finally {
  db.close()
  await browser.close()
  await fixture.close()
}
