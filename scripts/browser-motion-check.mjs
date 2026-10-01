import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { startFixture, client } from '../tests/helpers/server.mjs'

const fixture = await startFixture(3256)
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
await mkdir('test-results/motion-video', { recursive: true })
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: 'test-results/motion-video', size: { width: 1280, height: 900 } },
  })
  const other = client(fixture.base)
  await other.request('/api/guest', { name: 'Rafa' })
  const tracks = (await other.request('/api/search?q=Faixa&source=local')).data.tracks
  for (const track of tracks.slice(0, 3)) await other.request('/api/queue', track)
  await context.request.post(fixture.base + '/api/guest', { data: { name: 'Bia' } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (msg) => {
    if (
      ['warning', 'error'].includes(msg.type()) &&
      /Extraneous|Invalid vnode|Hydration/i.test(msg.text())
    )
      errors.push(msg.text())
  })
  await page.goto(fixture.base + '/busca')
  await expect(page.locator('.guest-identity')).toContainText('Bia')
  await page.getByRole('button', { name: 'Biblioteca local', exact: true }).click()
  await page.getByRole('textbox', { name: 'Buscar música' }).fill('Faixa')
  await page.getByRole('textbox', { name: 'Buscar música' }).press('Enter')
  await expect(page.locator('.results li')).toHaveCount(7)
  await page
    .getByRole('button', { name: 'Adicionar ' + tracks[3].title + ' à fila', exact: true })
    .click()
  await expect(page.locator('.motion-feedback[data-kind="add"]')).toContainText('Boa escolha!')
  await expect(page.locator('.motion-cue-active').first()).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Adicionar ' + tracks[3].title + ' à fila', exact: true }),
  ).toBeDisabled()

  const react = async (label, kind) => {
    await page.getByRole('button', { name: label, exact: true }).click()
    await expect(page.locator('.motion-feedback[data-kind="' + kind + '"]')).toBeVisible()
    // Vue keeps the outgoing toast in the DOM until its leave transition ends.
    await expect(page.locator('.motion-feedback')).toHaveCount(1)
  }
  await react('Like para subir na fila: ' + tracks[2].title, 'like')
  await expect(page.locator('.queue-card').first()).toContainText(tracks[2].title)
  const dark = await page
    .locator('.motion-feedback[data-kind="like"]')
    .evaluate((el) => getComputedStyle(el).borderTopColor)
  await page.screenshot({ path: 'test-results/motion-dark.png', fullPage: true })
  await react('Retirar meu like: ' + tracks[2].title, 'undo')
  await react('Dislike para descer na fila: ' + tracks[0].title, 'dislike')
  await expect(page.locator('.queue-card').last()).toContainText(tracks[0].title)
  await react('Retirar meu dislike: ' + tracks[0].title, 'undo')
  await expect(page.locator('.motion-burst')).toHaveCount(0, { timeout: 2000 })

  await page.getByRole('button', { name: 'Usar tema claro', exact: true }).click()
  await react('Like para subir na fila: ' + tracks[2].title, 'like')
  const light = await page
    .locator('.motion-feedback[data-kind="like"]')
    .evaluate((el) => getComputedStyle(el).borderTopColor)
  expect(light).not.toBe(dark)
  await page.screenshot({ path: 'test-results/motion-light.png', fullPage: true })

  // Failed commands must not celebrate, even while an optimistic queue item was visible.
  await page.getByRole('button', { name: 'Fechar confirmação', exact: true }).click()
  await page.route('**/api/queue', (route) =>
    route.fulfill({ status: 409, json: { statusMessage: 'Pedido recusado no teste' } }),
  )
  const rejected = page.getByRole('button', {
    name: 'Adicionar ' + tracks[4].title + ' à fila',
    exact: true,
  })
  await rejected.click()
  await expect(page.locator('.error-alert')).toContainText('Pedido recusado no teste')
  await expect(page.locator('.motion-feedback')).toHaveCount(0)
  await expect(rejected).not.toHaveClass(/just-added/)
  await page.unroute('**/api/queue')
  await page.getByRole('button', { name: 'Fechar aviso', exact: true }).click()

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await react('Retirar meu like: ' + tracks[2].title, 'undo')
  expect(
    await page
      .locator('.motion-cue-active')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
  await expect(page.locator('.motion-feedback[data-kind="undo"]')).toContainText('Reação retirada')
  await page.emulateMedia({ reducedMotion: 'no-preference' })

  await page.getByRole('button', { name: 'Desativar animações', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')
  await page.reload()
  await expect(page.locator('.guest-identity')).toContainText('Bia')
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')
  await expect(page.getByRole('button', { name: 'Ativar animações', exact: true })).toBeVisible()
  await react('Like para subir na fila: ' + tracks[2].title, 'like')
  expect(
    await page
      .locator('.motion-cue-active')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
  expect(
    await page
      .locator('.motion-burst')
      .first()
      .evaluate((el) => getComputedStyle(el).display),
  ).toBe('none')
  await page.getByRole('button', { name: 'Ativar animações', exact: true }).click()

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: 'test-results/motion-mobile.png', fullPage: true })
  await expect(page.locator('.motion-burst')).toHaveCount(0, { timeout: 2000 })
  expect(errors).toEqual([])
  const video = page.video()
  await context.close()
  await video.saveAs('test-results/motion-demo.webm')
  console.log(
    'Motion: add, like, dislike, undo, rejected request, themes, reduced motion, persisted preference, particle cleanup and 320–1440px OK',
  )
} finally {
  await browser.close()
  await fixture.close()
}
