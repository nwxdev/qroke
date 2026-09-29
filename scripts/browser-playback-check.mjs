import { chromium, expect } from '@playwright/test'
import { openFixtureDatabase } from '../tests/helpers/database.mjs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3188)
const browser = await chromium.launch({
  headless: true,
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
  args: ['--no-sandbox'],
})
const db = await openFixtureDatabase(fixture.dir)
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  await context.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
      window.fakes=[]
      window.YT={PlayerState:{ENDED:0},Player:class {
        constructor(node,options) { this.events=options.events; this.id=options.videoId; this.frame=document.createElement('iframe'); this.frame.title='YouTube simulado'; node.replaceWith(this.frame); window.fake=this; window.fakes.push(this); setTimeout(()=>this.events.onReady({target:this}),0) }
        getIframe(){return this.frame}
        getCurrentTime(){return 0}
        getDuration(){return 30}
        seekTo(){}
        playVideo(){this.playing=true}
        pauseVideo(){this.playing=false}
        setVolume(value){this.volume=value}
        mute(){this.muted=true}
        unMute(){this.muted=false}
        destroy(){this.playing=false; this.frame.remove()}
      }}
      window.onYouTubeIframeAPIReady?.()
    `,
    }),
  )
  await context.request.post(fixture.base + '/api/auth', { data: { action: 'login', pin: '4321' } })
  const host = await context.newPage(),
    player = await context.newPage()
  for (const page of [host, player]) page.on('pageerror', (e) => errors.push(e.message))
  await player.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgentData', {
      configurable: true,
      value: {
        platform: 'Android',
        mobile: true,
        getHighEntropyValues: async () => ({
          platform: 'Android',
          mobile: true,
          model: 'SM-S921B',
          platformVersion: '16.0.0',
          fullVersionList: [{ brand: 'Google Chrome', version: '146.0.7777.10' }],
        }),
      },
    })
  })
  await host.goto(fixture.base + '/host')
  await player.goto(fixture.base + '/tv')
  await expect
    .poll(async () => player.evaluate(() => sessionStorage.getItem('qroke:device')))
    .not.toBe(null)
  const device = await player.evaluate(() => JSON.parse(sessionStorage.getItem('qroke:device')))
  await context.request.post(fixture.base + '/api/control', {
    data: { action: 'assign', deviceId: device.id },
  })
  const state = () => db.readState()
  const make = (n) => ({
    id: String(n).padStart(11, '0'),
    queueId: randomUUID(),
    source: 'youtube',
    title: 'Faixa ' + n,
    artist: 'Teste',
    duration: 30,
    thumbnail: '',
    karaoke: false,
    guestId: 'test',
    guestName: 'Ana',
    origin: 'human',
    enqueuedAt: n,
    round: 0,
    manualOrder: null,
  })
  const first = make(1),
    second = make(2),
    third = make(3),
    fourth = make(4)
  await db.writeState(
    JSON.stringify({
      ...(await state()),
      current: first,
      queue: [second, third, fourth],
      revision: (await state()).revision + 1,
    }),
  )
  await expect(player.locator('iframe')).toBeVisible()
  await player.locator('.header-persistent .screen-sound-button').click()
  await expect.poll(async () => player.evaluate(() => window.fake.playing)).toBe(true)
  const slider = host.getByRole('slider', { name: /Volume do PLAYER/ })
  await slider.fill('37')
  await slider.dispatchEvent('change')
  await expect.poll(async () => player.evaluate(() => window.fake.volume)).toBe(37)
  await player.evaluate(() => {
    window.frameBeforeMenu = document.querySelector('iframe')
  })
  await player.setViewportSize({ width: 390, height: 844 })
  await player.getByRole('button', { name: 'Abrir menu', exact: true }).click()
  await expect(player.getByRole('dialog', { name: 'Menu da festa' })).toBeVisible()
  expect(
    await player.evaluate(
      () => window.frameBeforeMenu === document.querySelector('iframe') && window.fake.playing,
    ),
  ).toBe(true)
  // Expandir para desktop fecha o menu e preserva o mesmo player em reprodução.
  await player.setViewportSize({ width: 1440, height: 1000 })
  await expect(player.getByRole('dialog', { name: 'Menu da festa' })).toBeHidden()
  await expect(player.locator('.player-header .screen-sound-button')).toContainText('Som ativo')
  expect(
    await player.evaluate(
      () =>
        window.frameBeforeMenu === document.querySelector('iframe') &&
        window.fake.playing &&
        window.fake.volume === 37,
    ),
  ).toBe(true)

  await host.getByRole('button', { name: 'Silenciar player', exact: true }).click()
  await expect.poll(async () => player.evaluate(() => window.fake.muted)).toBe(true)
  await host.getByRole('button', { name: 'Restaurar volume', exact: true }).click()
  await expect.poll(async () => player.evaluate(() => window.fake.volume)).toBe(37)
  await expect.poll(async () => player.evaluate(() => window.fake.muted)).toBe(false)
  await host.getByRole('button', { name: 'Pular', exact: true }).click()
  await expect.poll(async () => player.evaluate(() => window.fake.id)).toBe(second.id)
  await expect.poll(async () => player.evaluate(() => window.fake.volume)).toBe(37)
  await player.evaluate(() => {
    window.fakes[0].events.onStateChange({ data: 0 })
    window.fakes[0].events.onError({ data: 150 })
    window.fake.events.onAutoplayBlocked()
  })
  await expect(player.getByText('Ative o som ou use o botão de play do vídeo.')).toBeVisible()
  expect((await state()).current.queueId).toBe(second.queueId)
  await player.evaluate(() => {
    window.fake.events.onError({ data: 150 })
    window.fake.events.onError({ data: 150 })
  })
  await expect.poll(async () => player.evaluate(() => window.fake.id)).toBe(third.id)
  expect((await state()).history.filter((t) => t.queueId === second.queueId)).toHaveLength(1)
  await player.evaluate(() => window.fake.events.onError({ data: 150 }))
  await expect(host.locator('.playback-notice')).toContainText('preservar a fila')
  expect((await state()).current.queueId).toBe(third.queueId)
  expect((await state()).queue.map((t) => t.queueId)).toEqual([fourth.queueId])
  await expect.poll(async () => player.evaluate(() => window.fake.playing)).toBe(false)
  await expect(
    player.getByRole('button', { name: /Tentar novamente|Pular esta música/ }),
  ).toHaveCount(0)
  await host.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect.poll(async () => (await state()).current.queueId).not.toBe(third.queueId)
  await expect.poll(async () => player.evaluate(() => window.fakes.length)).toBe(4)
  await player.evaluate(() => window.fake.events.onError({ data: 153 }))
  await expect(host.locator('.playback-notice')).toContainText('erro 153')
  expect((await state()).current.id).toBe(third.id)
  expect((await state()).queue).toHaveLength(1)
  await expect.poll(async () => host.locator('.managed-device').count()).toBe(2)
  const row = host
    .locator('.managed-device')
    .filter({ has: host.locator('.tag').filter({ hasText: /^PLAYER$/ }) })
  await expect(row).toContainText('Modelo: SM-S921B')
  await expect(row).toContainText('Android 16.0.0')
  await expect(row).toContainText('Chrome 146.0.7777.10')
  await expect(row).toContainText('Tela: Player')
  await expect(row).toContainText('No navegador')
  await row.getByRole('button', { name: 'Renomear', exact: true }).click()
  await row.getByRole('textbox').fill('TV da sala')
  await row.getByRole('button', { name: 'Salvar aparelho', exact: true }).click()
  await expect(row).toContainText('TV da sala')
  for (const theme of ['light', 'dark']) {
    await host
      .getByRole('button', {
        name: theme === 'light' ? 'Usar tema claro' : 'Usar tema escuro',
        exact: true,
      })
      .click()
    await host.setViewportSize({ width: 360, height: 800 })
    await expect(slider).toBeVisible()
    await host.screenshot({ path: 'test-results/playback-' + theme + '.png', fullPage: true })
    const overflow = await host.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
        .map((el) => ({
          tag: el.tagName,
          class: el.className,
          width: el.getBoundingClientRect().width,
          text: el.textContent?.slice(0, 90),
        }))
        .slice(0, 20),
    }))
    if (overflow.scroll > overflow.width) console.log(JSON.stringify(overflow))
    expect(overflow.scroll <= overflow.width).toBe(true)
    await host.screenshot({ path: 'test-results/playback-' + theme + '.png', fullPage: true })
  }
  await host.getByRole('button', { name: 'Remover aparelho TV da sala', exact: true }).click()
  await expect.poll(async () => (await state()).playerId).toBe(null)
  await expect(player.locator('iframe')).toHaveCount(0)
  await expect(player.locator('.header-persistent .screen-sound-button')).toBeVisible()
  await expect(player.locator('dialog[open]')).toHaveCount(0)
  expect((await state()).queue).toHaveLength(1)
  expect((await state()).current.id).toBe(third.id)
  expect(errors).toEqual([])
  console.log(
    'PLAYER remoto: volume/mute, pular, eventos duplicados/atrasados, autoplay, cascata, retry, erro153, identificação Android, renomear/remover e temas mobile OK',
  )
} finally {
  await db.close()
  await browser.close()
  await fixture.close()
}
