import { chromium, expect } from '@playwright/test'
import Database from 'better-sqlite3'
import { join } from 'node:path'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3194)
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
const db = new Database(join(fixture.dir, 'party.sqlite'))
async function contrast(page, selector, backdrop = false) {
  return page
    .locator(selector)
    .first()
    .evaluate((el, backdrop) => {
      const rgba = (s) => (s.match(/[\d.]+/g) || []).map(Number)
      const blend = (front, back) =>
        front.slice(0, 3).map((n, i) => n * (front[3] ?? 1) + back[i] * (1 - (front[3] ?? 1)))
      const lum = (rgb) =>
        rgb
          .map((n) => {
            n /= 255
            return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
          })
          .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0)
      let bg = [255, 255, 255],
        chain = [],
        node = el
      while (node) {
        chain.unshift(node)
        node = node.parentElement
      }
      for (const item of chain) bg = blend(rgba(getComputedStyle(item).backgroundColor), bg)
      if (backdrop) {
        const layer = document.querySelector('.tv-backdrop')
        if (layer) bg = blend([0, 0, 0, Number(getComputedStyle(layer).opacity)], bg)
      }
      const fg = blend(rgba(getComputedStyle(el).color), bg),
        a = lum(fg),
        b = lum(bg)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }, backdrop)
}
async function checkBrand(page, theme) {
  const logos = page.locator('.brand-logo')
  expect(await logos.count()).toBeGreaterThan(0)
  for (const logo of await logos.all()) {
    if (!(await logo.isVisible())) continue
    const tone = await logo.getAttribute('class')
    const selected = tone.includes('brand-logo--dark') ? 'dark' : theme
    const visible = logo.locator('.brand-logo-' + selected)
    await expect(visible).toBeVisible()
    await expect
      .poll(() => visible.evaluate((img) => img.complete && img.naturalWidth === 2172))
      .toBe(true)
    await expect(
      logo.locator('.brand-logo-' + (selected === 'dark' ? 'light' : 'dark')),
    ).toBeHidden()
    const box = await visible.boundingBox()
    expect(Math.abs(box.width / box.height - 3)).toBeLessThan(0.03)
  }
}
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(fixture.base)
  await page.getByLabel('Seu nome', { exact: true }).fill('Teste')
  for (const theme of ['dark', 'light']) {
    if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== theme)
      await page
        .getByRole('button', { name: theme === 'light' ? 'Usar tema claro' : 'Usar tema escuro' })
        .click()
    await checkBrand(page, theme)
    await expect.poll(() => contrast(page, '.join-card .q-btn')).toBeGreaterThanOrEqual(4.5)
    expect(await contrast(page, '.hero p')).toBeGreaterThanOrEqual(4.5)
    expect(await contrast(page, '.hero .eyebrow')).toBeGreaterThanOrEqual(4.5)
    await page.screenshot({ path: 'test-results/theme-guest-' + theme + '.png', fullPage: true })
  }
  await page.goto(fixture.base + '/host')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar PIN' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Liberar controles', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Usar tema claro' }).click()
  await page.getByRole('button', { name: 'Liberar controles', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(() =>
        document.querySelector('dialog[open]').contains(document.activeElement),
      ),
    ).toBe(true)
  }
  await page.getByLabel('PIN do anfitrião', { exact: true }).fill('4321')
  expect(await contrast(page, '.admin-dialog .q-btn')).toBeGreaterThanOrEqual(4.5)
  await checkBrand(page, 'light')
  await page.screenshot({ path: 'test-results/pin-modal-light.png', fullPage: true })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Liberar controles', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Tocar neste dispositivo', exact: true }).click()
  await expect(page.locator('.empty-player')).toBeVisible()
  expect(await contrast(page, '.empty-player p')).toBeGreaterThanOrEqual(4.5)
  await checkBrand(page, 'light')

  const waitingContext = await browser.newContext()
  const waiting = await waitingContext.newPage()
  await waiting.goto(fixture.base + '/host')
  await expect(
    waiting.getByRole('dialog').getByText('Outro anfitrião está no controle', { exact: false }),
  ).toBeVisible()
  await expect(waiting.getByLabel('PIN do anfitrião', { exact: true })).toBeDisabled()
  await context.request.post(fixture.base + '/api/auth', { data: { action: 'logout' } })
  await expect(waiting.getByLabel('PIN do anfitrião', { exact: true })).toBeEnabled({
    timeout: 6000,
  })
  await waiting.getByLabel('PIN do anfitrião', { exact: true }).fill('4321')
  await waiting
    .getByRole('dialog')
    .getByRole('button', { name: 'Liberar controles', exact: true })
    .click()
  await expect(waiting.getByText('Admin liberado', { exact: true })).toBeVisible()
  expect(
    (
      await context.request.post(fixture.base + '/api/control', { data: { action: 'skip' } })
    ).status(),
  ).toBe(401)
  console.log(
    'PIN modal: fechar, Escape, foco contido, aviso de outro anfitrião e liberação após logout OK',
  )
  const state = JSON.parse(db.prepare('SELECT state FROM party WHERE id=1').get().state)
  state.current = {
    id: 'aaaaaaaaaaa',
    source: 'youtube',
    title: 'Texto da TV no tema claro',
    artist: 'Artista de teste',
    guestName: 'Teste',
    queueId: 'fixture',
    guestId: 'fixture',
    duration: 180,
    thumbnail:
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="black"/%3E%3C/svg%3E',
    karaoke: false,
    origin: 'human',
    enqueuedAt: Date.now(),
    round: 0,
    manualOrder: null,
  }
  state.playerId = null
  state.revision++
  db.prepare('UPDATE party SET state=? WHERE id=1').run(JSON.stringify(state))
  await page.goto(fixture.base + '/tv')
  await page.getByRole('button', { name: 'Usar tema claro' }).click()
  await expect(page.locator('.tv-backdrop')).toBeVisible()
  expect(await contrast(page, '.tv-placeholder h1', true)).toBeGreaterThanOrEqual(4.5)
  expect(await contrast(page, '.tv-placeholder p', true)).toBeGreaterThanOrEqual(4.5)
  await page.screenshot({ path: 'test-results/theme-tv-light.png', fullPage: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await page.locator('.tv-stage').evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe('0s')
  // Marca, tema e menu permanecem acessíveis sem sobreposição.
  for (const path of ['/busca', '/host', '/player']) {
    await page.goto(fixture.base + path)
    if (path === '/host') await page.getByRole('button', { name: 'Fechar PIN' }).click()
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      for (const theme of ['dark', 'light']) {
        if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== theme)
          await page
            .getByRole('button', {
              name: theme === 'light' ? 'Usar tema claro' : 'Usar tema escuro',
            })
            .click()
        await checkBrand(page, theme)
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
          .toBe(true)
        if (path === '/player') {
          const logo = await page.locator('.player-brand').boundingBox()
          const menu = await page.locator('.header-menu').boundingBox()
          expect(logo.x + logo.width).toBeLessThanOrEqual(menu.x)
          const qr = await page.locator('.qr-plate').boundingBox()
          const signature = await page.locator('.invite-brand').boundingBox()
          expect(signature.y).toBeGreaterThanOrEqual(qr.y + qr.height)
        }
        if (width === 390 || width === 1280)
          await page.screenshot({
            path: 'test-results/brand-' + path.slice(1) + '-' + theme + '-' + width + '.png',
            fullPage: true,
          })
      }
    }
  }
  console.log(
    'Marca: originais carregados, versão por tema, proporção preservada e sem sobreposição/overflow entre 320 e 1280px nas três telas OK',
  )
  expect(errors).toEqual([])
  console.log('Contraste >=4.5 em botões, textos da TV e player; temas e movimento reduzido OK')
} finally {
  db.close()
  await browser.close()
  await fixture.close()
}
