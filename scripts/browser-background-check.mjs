import { chromium, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { startFixture } from '../tests/helpers/server.mjs'
import { openFixtureDatabase } from '../tests/helpers/database.mjs'
process.env.QROKE_TEST_TRACK_SECONDS = '8'
const fixture = await startFixture(3235)
const db = await openFixtureDatabase(fixture.dir)
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-audio-output'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
await mkdir('test-results', { recursive: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  context.on('page', (page) => page.on('pageerror', (e) => errors.push(e.message)))
  await context.addInitScript(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => !!window.testHidden,
    })
    window.wakeRequests = 0
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        async request() {
          window.wakeRequests++
          if (window.rejectWake) throw new Error('battery')
          const lock = new EventTarget()
          lock.release = async () => {
            lock.released = true
            lock.dispatchEvent(new Event('release'))
          }
          window.testWake = lock
          return lock
        },
      },
    })
  })
  const providerScript = `window.YT={PlayerState:{ENDED:0},Player:class {
      constructor(node,o){this.events=o.events;this.position=0;this.frame=document.createElement('iframe');this.frame.title='YouTube simulado';node.replaceWith(this.frame);window.fake=this;setTimeout(()=>this.events.onReady({target:this}),0)}
      getIframe(){return this.frame} getCurrentTime(){return this.position} getDuration(){return 180}
      seekTo(n){this.position=n} playVideo(){this.playing=true} pauseVideo(){this.playing=false}
      setVolume(n){this.volume=n} getVolume(){return this.volume} isMuted(){return false} unMute(){} mute(){}
      destroy(){this.playing=false;this.frame.remove()}
    }};window.onYouTubeIframeAPIReady?.()`
  await context.addInitScript(providerScript)
  await context.request.post(fixture.base + '/api/auth', { data: { action: 'login', pin: '4321' } })
  await context.request.post(fixture.base + '/api/guest', { data: { name: 'Festa' } })
  const page = await context.newPage()
  await page.goto(fixture.base + '/host')
  await page.getByRole('button', { name: 'Tocar neste dispositivo', exact: true }).click()
  await expect.poll(async () => (await db.readState()).playerId).toBeTruthy()
  await expect(page.getByText('Player pronto', { exact: true })).toBeVisible()
  const track = (title) => ({
    id: 'abcdefghijk',
    source: 'youtube',
    title,
    artist: 'Artista',
    duration: 180,
    thumbnail: '',
    karaoke: false,
    queueId: randomUUID(),
    guestId: 'fixture',
    guestName: 'Festa',
    origin: 'human',
    enqueuedAt: Date.now(),
    round: 0,
    manualOrder: null,
  })
  const first = track('Primeira música'),
    second = track('Segunda música')
  const state = await db.readState()
  Object.assign(state, {
    current: first,
    queue: [second],
    position: 12,
    paused: false,
    revision: state.revision + 1,
  })
  await db.writeState(state)
  await expect.poll(() => page.evaluate(() => window.fake?.playing)).toBe(true)
  await expect(page.locator('.persistent-controls')).toContainText('Tela ligada')
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  expect(await page.evaluate(() => window.fake.playing)).toBe(true)
  const hidden = async (value) =>
    page.evaluate((hidden) => {
      window.testHidden = hidden
      document.dispatchEvent(new Event('visibilitychange'))
    }, value)
  await hidden(true)
  await expect.poll(() => page.evaluate(() => window.fake.playing)).toBe(false)
  await expect.poll(() => page.evaluate(() => window.testWake.released)).toBe(true)
  await hidden(false)
  await expect.poll(() => page.evaluate(() => window.fake.playing)).toBe(true)
  await expect(page.locator('.persistent-controls')).toContainText('Tela ligada')
  await page.evaluate(() => {
    window.fake.position = 34.5
  })
  // Real Document Picture-in-Picture API, simulated provider only.
  // Document PiP is native; only YouTube is simulated, including its navigated wrapper.
  await page.evaluate(
    (source) =>
      documentPictureInPicture.addEventListener('enter', ({ window: target }) => {
        const observer = new MutationObserver(() => {
          const wrapper = target.document.querySelector('[data-youtube-window]')
          if (!wrapper || wrapper.dataset.mockInstalled) return
          wrapper.dataset.mockInstalled = 'yes'
          wrapper.addEventListener('load', () => {
            const script = wrapper.contentDocument.createElement('script')
            script.textContent = source
            wrapper.contentDocument.head.append(script)
          })
        })
        observer.observe(target.document, { childList: true, subtree: true })
      }),
    providerScript,
  )
  await page.getByRole('button', { name: 'Mini player', exact: true }).click()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window.documentPictureInPicture.window?.document.querySelector('[data-youtube-window]')
            ?.contentWindow?.fake?.playing,
      ),
    )
    .toBe(true)
  expect(
    await page.evaluate(
      () =>
        window.documentPictureInPicture.window.document.querySelector('[data-youtube-window]')
          .contentWindow.fake.position,
    ),
  ).toBe(34.5)
  expect(await page.locator('.youtube-frame iframe').count()).toBe(0)
  expect(await page.evaluate(() => window.fake.playing)).toBe(false)
  const dimensions = await page.evaluate(() => {
    const box = documentPictureInPicture.window.document
      .querySelector('iframe')
      .getBoundingClientRect()
    return { width: box.width, height: box.height }
  })
  expect(dimensions.width).toBeGreaterThanOrEqual(200)
  expect(dimensions.height).toBeGreaterThanOrEqual(200)
  await hidden(true)
  expect(
    await page.evaluate(
      () =>
        documentPictureInPicture.window.document.querySelector('[data-youtube-window]')
          .contentWindow.fake.playing,
    ),
  ).toBe(true)
  await page.evaluate(() =>
    documentPictureInPicture.window.document
      .querySelector('[data-youtube-window]')
      .contentWindow.fake.events.onStateChange({ data: 0 }),
  )
  await expect.poll(async () => (await db.readState()).current.queueId).toBe(second.queueId)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          documentPictureInPicture.window.document.querySelector('.persistent-controls')
            .textContent,
      ),
    )
    .toContain('Segunda música')
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          documentPictureInPicture.window.document.querySelector('[data-youtube-window]')
            .contentWindow.fake.playing,
      ),
    )
    .toBe(true)
  await page.evaluate(() => {
    documentPictureInPicture.window.document.querySelector(
      '[data-youtube-window]',
    ).contentWindow.fake.position = 48.75
    documentPictureInPicture.window.close()
  })
  await expect(page.locator('.youtube-frame iframe')).toHaveCount(1)
  await expect.poll(() => page.evaluate(() => window.fake.position)).toBe(48.75)
  expect(await page.evaluate(() => !!window.fake.playing)).toBe(false)
  await hidden(false)
  await expect.poll(() => page.evaluate(() => window.fake.playing)).toBe(true)
  expect(await page.evaluate(() => window.fake.position)).toBe(48.75)
  // A permission denial must leave the original player usable.
  await page.evaluate(() => {
    window.originalRequestWindow =
      documentPictureInPicture.requestWindow.bind(documentPictureInPicture)
    documentPictureInPicture.requestWindow = async () => {
      throw new Error('denied')
    }
  })
  await page.getByRole('button', { name: 'Mini player', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Não foi possível abrir o mini player' }),
  ).toBeVisible()
  expect(await page.evaluate(() => window.fake.playing)).toBe(true)
  await hidden(true)
  await page.evaluate(() => {
    window.rejectWake = true
  })
  await hidden(false)
  await expect(page.locator('.persistent-controls')).toContainText('Tela pode apagar')
  expect(await page.evaluate(() => window.fake.playing)).toBe(true)
  // Transferring the PLAYER while PiP is open must stop it before acknowledging the position.
  await page.evaluate(() => {
    documentPictureInPicture.requestWindow = window.originalRequestWindow
  })
  await page.getByRole('button', { name: 'Mini player', exact: true }).click()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          documentPictureInPicture.window?.document.querySelector('[data-youtube-window]')
            ?.contentWindow?.fake?.playing,
      ),
    )
    .toBe(true)
  await page.evaluate(() => {
    documentPictureInPicture.window.document.querySelector(
      '[data-youtube-window]',
    ).contentWindow.fake.position = 67.25
  })
  const target = await (
    await context.request.post(fixture.base + '/api/device', { data: { label: 'Outro PLAYER' } })
  ).json()
  const assigned = await context.request.post(fixture.base + '/api/control', {
    data: { action: 'assign', deviceId: target.id },
  })
  expect(assigned.status()).toBe(200)
  await expect.poll(async () => (await db.readState()).playerHandoff).toBeNull()
  expect((await db.readState()).position).toBe(67.25)
  await expect.poll(() => page.evaluate(() => !!documentPictureInPicture.window)).toBe(false)
  await expect(page.locator('.youtube-frame iframe')).toHaveCount(0)
  await page.getByRole('button', { name: 'Tocar neste dispositivo', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.fake?.playing), { timeout: 15000 }).toBe(true)
  // Native audio must advance the queue while the document is hidden, without a new gesture.
  const { tracks } = await (
    await context.request.get(fixture.base + '/api/search?q=Faixa&source=local')
  ).json()
  const localState = await db.readState()
  Object.assign(localState, {
    current: { ...track('Áudio 1'), ...tracks[0] },
    queue: [{ ...track('Áudio 2'), ...tracks[1] }],
    position: 0,
    duration: 8,
    paused: false,
    revision: localState.revision + 1,
  })
  await db.writeState(localState)
  await expect
    .poll(() =>
      page
        .locator('audio')
        .evaluate((a) => !a.paused && a.currentTime > 0)
        .catch(() => false),
    )
    .toBe(true)
  await hidden(true)
  const position = await page.locator('audio').evaluate((a) => a.currentTime)
  await expect
    .poll(() => page.locator('audio').evaluate((a) => a.currentTime))
    .toBeGreaterThan(position + 0.2)
  await expect.poll(async () => (await db.readState()).current, { timeout: 30000 }).toBe(null)
  const history = (await db.readState()).history
  expect(
    history.filter(
      (t) => localState.current.queueId === t.queueId || localState.queue[0].queueId === t.queueId,
    ),
  ).toHaveLength(2)
  await hidden(false)
  await expect(page.locator('.persistent-controls')).toContainText('Tela livre')
  // Unsupported mobile/PWA browsers receive honest guidance and no nonworking button.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await mobile.addInitScript(() => {
    delete window.documentPictureInPicture
  })
  const phone = await mobile.newPage()
  await phone.goto(fixture.base + '/player')
  await phone.locator('.background-help summary').click()
  await expect(phone.locator('.background-help')).toContainText(
    'Instalar o PWA não remove essa limitação',
  )
  await expect(phone.locator('.background-help')).toContainText(
    'não está disponível neste navegador',
  )
  await expect(phone.getByRole('button', { name: 'Abrir mini player', exact: true })).toHaveCount(0)
  await phone.screenshot({ path: 'test-results/background-mobile-guidance.png', fullPage: true })
  expect(errors).toEqual([])
  console.log(
    'Native PiP open/close, position, next track, hidden main tab, visible-only YouTube, wake lock release/rejection and native audio queue in background OK (provider and visibility simulated)',
  )
} finally {
  await browser.close()
  await db.close()
  await fixture.close()
}
