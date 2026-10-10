import { chromium, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { startFixture } from '../tests/helpers/server.mjs'
import { openFixtureDatabase } from '../tests/helpers/database.mjs'
const fixture = await startFixture(3291, {
  NUXT_ACCESS_REQUIRED: 'true',
  NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3291',
})
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
})
const db = await openFixtureDatabase(fixture.dir)
try {
  await mkdir('test-results', { recursive: true })
  const errors = []
  // Installation detection must use browser evidence, not a stale local-storage flag.
  for (const mode of ['unknown', 'available', 'installed', 'standalone']) {
    const context = await browser.newContext()
    await context.addInitScript((mode) => {
      localStorage.setItem('qroke:pwa-installed', 'true')
      Object.defineProperty(navigator, 'standalone', { value: mode === 'standalone' })
      Object.defineProperty(navigator, 'getInstalledRelatedApps', {
        value:
          mode === 'unknown'
            ? undefined
            : async () =>
                mode === 'installed'
                  ? [{ platform: 'webapp', url: location.origin + '/site.webmanifest' }]
                  : [],
      })
    }, mode)
    const page = await context.newPage()
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(fixture.base + '/criar-festa')
    await expect(page.getByRole('button', { name: 'Instalar QRokê' })).toBeHidden()
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
    const menu = page.getByRole('dialog', { name: 'Menu da festa' })
    if (mode === 'installed') {
      await expect(menu.getByRole('link', { name: 'Abrir QRokê' })).toHaveAttribute(
        'href',
        '/criar-festa',
      )
      await expect(menu.getByRole('link', { name: 'Abrir QRokê' })).toHaveAttribute(
        'target',
        '_blank',
      )
    } else if (mode === 'standalone') {
      await expect(menu.getByText('Você já está no aplicativo')).toBeVisible()
      await expect(menu.getByRole('button', { name: 'Instalar QRokê' })).toHaveCount(0)
    } else {
      await expect(menu.getByRole('button', { name: 'Instalar QRokê' })).toBeVisible()
      if (mode === 'unknown') {
        await menu.getByRole('button', { name: 'Instalar QRokê' }).click()
        await expect(
          menu.getByRole('region', { name: 'Aplicativo QRokê' }).getByRole('status'),
        ).toContainText('No menu do navegador')
        await menu.getByRole('button', { name: 'Fechar aviso', exact: true }).click()
        await expect(
          menu.getByRole('region', { name: 'Aplicativo QRokê' }).getByRole('status'),
        ).toHaveCount(0)
      } else {
        await page.evaluate(() => {
          const event = new Event('beforeinstallprompt', { cancelable: true })
          event.prompt = async () => {
            window.installPrompted = true
            return { outcome: 'accepted' }
          }
          window.dispatchEvent(event)
        })
        await menu.getByRole('button', { name: 'Instalar QRokê' }).click()
        expect(await page.evaluate(() => window.installPrompted)).toBe(true)
        await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')))
        await expect(menu.getByRole('link', { name: 'Abrir QRokê' })).toBeVisible()
      }
    }
    await context.close()
  }
  const context = await browser.newContext({ viewport: { width: 820, height: 1180 } })
  const embedHeaders = []
  await context.route('https://www.youtube.com/embed/**', async (route) => {
    embedHeaders.push(await route.request().allHeaders())
    await route.fulfill({
      contentType: 'text/html',
      body: '<html><body>Vídeo simulado</body></html>',
    })
  })
  await context.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `
    window.YT={PlayerState:{ENDED:0},Player:class {
      constructor(node,o){this.events=o.events;this.frame=node;window.initialEmbed={policy:node.referrerPolicy,src:node.src,allow:node.allow};window.fake=this;setTimeout(()=>this.events.onReady({target:this}),0)}
      getIframe(){return this.frame} getCurrentTime(){return 0} getDuration(){return 180}
      seekTo(){} playVideo(){this.playing=true} pauseVideo(){this.playing=false} setVolume(v){this.volume=v} getVolume(){return this.volume||0} mute(){this.muted=true} unMute(){this.muted=false} isMuted(){return !!this.muted} destroy(){this.frame.remove()}
    }};window.onYouTubeIframeAPIReady?.()
  `,
    }),
  )
  const name = 'Festa com um nome bem comprido para conferir a leitura no celular e no tablet'
  const creation = await context.request.post(fixture.base + '/api/parties', {
    data: { name, ownerName: 'Ana', idempotencyKey: randomUUID() },
  })
  expect(creation.status()).toBe(201)
  const { party } = await creation.json(),
    api = fixture.base + '/api/f/' + party.id,
    path = '/f/' + party.id
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  for (const screen of ['/host', '/busca', '/qr']) {
    await page.goto(fixture.base + path + screen)
    for (const [width, height] of [
      [320, 720],
      [768, 1024],
      [820, 1180],
      [1024, 768],
    ]) {
      await page.setViewportSize({ width, height })
      await expect(page.locator('header .party-brand-name').first()).toHaveAttribute('title', name)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        screen + ' ' + width,
      ).toBe(true)
    }
  }
  await page.goto(fixture.base + path + '/player')
  await expect
    .poll(() => page.evaluate((id) => sessionStorage.getItem('qroke:device:' + id), party.id))
    .not.toBe(null)
  const device = await page.evaluate(
    (id) => JSON.parse(sessionStorage.getItem('qroke:device:' + id)),
    party.id,
  )
  expect(
    (
      await context.request.post(api + '/control', {
        data: { action: 'assign', deviceId: device.id },
      })
    ).ok(),
  ).toBe(true)
  const current = {
    id: 'abcdefghijk',
    queueId: randomUUID(),
    source: 'youtube',
    title: 'Música de teste',
    artist: 'Artista',
    duration: 180,
    thumbnail: '',
    karaoke: false,
    guestId: 'test',
    guestName: 'Ana',
    origin: 'human',
    enqueuedAt: Date.now(),
    round: 0,
    manualOrder: null,
  }
  const collection = db.db.collection('parties'),
    filter = { _id: 'nwx:' + party.id }
  await collection.updateOne(filter, {
    $set: {
      'state.current': current,
      'state.queue': [
        { ...current, id: 'lmnopqrstuv', queueId: randomUUID(), title: 'Próxima música' },
      ],
      'state.mode': 'video',
      'state.paused': false,
    },
    $inc: { 'state.revision': 1 },
  })
  await expect(page.locator('.persistent-player iframe')).toBeVisible()
  const embed = await page.evaluate(() => window.initialEmbed)
  expect(embed.policy).toBe('strict-origin-when-cross-origin')
  expect(new URL(embed.src).searchParams.get('origin')).toBe(fixture.base)
  expect(embed.allow).toContain('autoplay')
  await expect.poll(() => embedHeaders[0]?.referer).toBe(fixture.base + '/')
  for (const theme of ['classic', 'sonic-day']) {
    expect(
      (await context.request.post(api + '/control', { data: { action: 'theme', theme } })).ok(),
    ).toBe(true)
    await expect(page.locator('html')).toHaveAttribute('data-party-theme', theme)
    for (const color of ['dark', 'light']) {
      if ((await page.locator('html').getAttribute('data-theme')) !== color)
        await page.locator('header .theme-toggle').click()
      for (const [width, height] of [
        [320, 720],
        [390, 844],
        [768, 1024],
        [820, 1180],
        [1024, 768],
        [1440, 900],
        [568, 320],
      ]) {
        await page.setViewportSize({ width, height })
        await expect
          .poll(
            async () => {
              const r = await page.locator('.persistent-player iframe').boundingBox()
              return (
                !!r &&
                r.width >= 200 &&
                r.height >= 200 &&
                r.x >= 0 &&
                r.y >= 0 &&
                r.x + r.width <= width + 1 &&
                r.y + r.height <= height + 1
              )
            },
            { message: theme + '/' + color + ' player ' + width },
          )
          .toBe(true)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        )
        expect((await page.locator('.tv-screen').boundingBox()).height).toBe(height)
        await expect(page.locator('.sonic-banner')).toHaveCount(0)
        await expect(page.locator('.qr-plate svg')).toBeVisible()
        if ([390, 820, 1024].includes(width))
          await page.screenshot({
            path: 'test-results/responsive-' + theme + '-' + color + '-' + width + '.png',
          })
      }
    }
  }
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.evaluate(() => window.fake.events.onError({ data: 152 }))
  await expect(page.locator('.playback-notice')).toContainText('erro 152')
  await page.getByRole('button', { name: 'Fechar erro de reprodução' }).click()
  await expect(page.locator('.playback-notice')).toHaveCount(0)
  const state = async () => await (await context.request.get(api + '/state')).json()
  expect((await state()).playbackIssue.halted).toBe(true)
  expect((await state()).queue).toHaveLength(1)
  expect((await state()).current.queueId).toBe(current.queueId)
  await page.goto(fixture.base + path + '/host')
  await page
    .getByRole('navigation', { name: 'Gerenciar festa' })
    .getByRole('button', { name: 'Player', exact: true })
    .click()
  await expect(page.getByRole('button', { name: 'Tentar reprodução novamente' })).toBeVisible()
  await page.getByRole('button', { name: 'Tentar reprodução novamente' }).click()
  await expect.poll(async () => (await state()).playbackIssue).toBe(null)
  await expect.poll(() => page.evaluate(() => window.fake?.playing)).toBe(true)
  await page.evaluate(() => window.fake.events.onError({ data: 152 }))
  await expect(page.locator('.playback-notice')).toContainText('erro 152')
  expect((await state()).queue).toHaveLength(1)
  await page.getByRole('button', { name: 'Fechar erro de reprodução' }).click()
  await page.getByRole('button', { name: 'Tentar reprodução novamente' }).click()
  await expect.poll(async () => (await state()).playbackIssue).toBe(null)
  expect(errors).toEqual([])
  console.log(
    'PWA no menu: disponível/instalado/standalone/sem API; nome longo; player 320–1440px e tablet em todos os temas; identificação YouTube antes do carregamento; erro152 fechável sem perder fila/retry OK',
  )
} finally {
  await browser.close()
  await db.close()
  await fixture.close()
}
