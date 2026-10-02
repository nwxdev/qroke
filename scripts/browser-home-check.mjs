import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3270, {
  NUXT_ACCESS_REQUIRED: 'true',
  NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3270',
})
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
try {
  await mkdir('test-results', { recursive: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (['warning', 'error'].includes(m.type()) && /hydration|invalid vnode/i.test(m.text()))
      errors.push(m.text())
  })
  await page.goto(fixture.base)
  const join = page.getByRole('button', { name: 'Entrar na festa', exact: true })
  const create = page.getByRole('button', { name: 'CRIAR FESTA', exact: true })
  const progress = page.getByRole('progressbar', { name: 'Preparação da festa' })
  await expect(create).toBeVisible()
  await expect(progress).toHaveAttribute('aria-valuenow', '0')
  await expect(create.locator('.app-icon')).toHaveCount(2)
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    const qr = await join.boundingBox()
    const cta = await create.boundingBox()
    expect(cta.y).toBeGreaterThan(qr.y + qr.height)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  for (const theme of ['dark', 'light']) {
    if (theme === 'light')
      await page.getByRole('button', { name: 'Usar tema claro', exact: true }).click()
    await create.hover()
    // Hover must retain the primary fill and readable foreground in both themes.
    await expect
      .poll(() =>
        create.evaluate((el) => {
          const style = getComputedStyle(el)
          const rgb = (text) =>
            text
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number)
              .map((v) => v / 255)
          const luminance = (color) =>
            rgb(color)
              .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
              .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
          // Browser color-mix may serialize as color(srgb ...); canvas normalizes it to RGB.
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 1
          const context = canvas.getContext('2d')
          const normalize = (color) => {
            context.fillStyle = color
            context.fillRect(0, 0, 1, 1)
            return (
              'rgb(' +
              Array.from(context.getImageData(0, 0, 1, 1).data)
                .slice(0, 3)
                .join(',') +
              ')'
            )
          }
          const a = luminance(normalize(style.color)),
            b = luminance(normalize(style.backgroundColor))
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        }),
      )
      .toBeGreaterThan(4.5)
    const before = await create.boundingBox()
    await page.mouse.down()
    const during = await create.boundingBox()
    expect(during.x).toBeCloseTo(before.x, 1)
    expect(during.y).toBeCloseTo(before.y, 1)
    expect(during.width).toBeCloseTo(before.width, 1)
    await page.mouse.up()
    await expect(page.getByLabel('Nome da festa', { exact: true })).toBeFocused()
    await expect(create.locator('.action-flash')).toHaveCount(0, { timeout: 2000 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: 'test-results/home-' + theme + '-desktop.png', fullPage: true })
  }
  await join.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await create.focus()
  await page.keyboard.press('Space')
  await expect(page.getByLabel('Nome da festa', { exact: true })).toBeFocused()
  await page.getByLabel('Nome da festa', { exact: true }).fill('Noite da galera')
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  await page.getByLabel('PIN do administrador', { exact: true }).fill('123456')
  await page.getByLabel('Confirmar PIN').fill('654321')
  await expect(progress).toHaveAttribute('aria-valuenow', '2')
  await page.getByRole('button', { name: 'Começar a festa', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Os PINs precisam ser iguais.')
  await page.getByLabel('Confirmar PIN').fill('123456')
  await expect(progress).toHaveAttribute('aria-valuenow', '3')
  await page.getByLabel('PIN do administrador', { exact: true }).fill('12345')
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  await page.getByRole('button', { name: 'Desativar animações', exact: true }).click()
  await create.click()
  expect(
    await create.locator('.action-icon').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
  expect(await create.locator('.action-flash').evaluate((el) => getComputedStyle(el).opacity)).toBe(
    '0',
  )
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')
  await page.getByRole('button', { name: 'Ativar animações', exact: true }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await create.click()
  expect(
    await create.locator('.action-icon').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
  expect(await create.locator('.action-flash').evaluate((el) => getComputedStyle(el).opacity)).toBe(
    '0',
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: 'test-results/home-light-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Usar tema escuro', exact: true }).click()
  await page.screenshot({ path: 'test-results/home-dark-mobile.png', fullPage: true })
  expect(errors).toEqual([])
  console.log(
    'Home: CTA below QR, keyboard focus, stationary hit targets, hover contrast, field progress, PIN error, themes, reduced motion, preference and 320–1440px OK',
  )
} finally {
  await browser.close()
  await fixture.close()
}
