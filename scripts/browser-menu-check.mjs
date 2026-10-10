import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { startFixture } from '../tests/helpers/server.mjs'

const fixture = await startFixture(3181)
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
try {
  await mkdir('test-results', { recursive: true })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(fixture.base + '/player')
  const menu = page.getByRole('dialog', { name: 'Menu da festa', exact: true })
  const trigger = page.getByRole('button', { name: 'Abrir menu', exact: true })
  for (const [width, height] of [
    [320, 720],
    [390, 844],
    [768, 900],
    [568, 320],
  ]) {
    await page.setViewportSize({ width, height })
    await expect(trigger).toBeVisible()
    await expect(page.locator('.header-menu > .header-navigation')).toBeHidden()
    await expect(page.locator('.header-persistent .screen-sound-button')).toHaveCount(0)
    const logo = await page.locator('.player-brand').boundingBox()
    const controls = await page.locator('.header-menu').boundingBox()
    expect(logo.x + logo.width).toBeLessThanOrEqual(controls.x)
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(menu).toBeVisible()
    await expect(page.locator('.header-persistent .screen-sound-button')).toHaveCount(0)
    await expect(menu.locator('.menu-actions .screen-sound-button')).toHaveCount(0)
    expect(await menu.boundingBox()).toEqual({ x: 0, y: 0, width, height })
    await expect(menu.getByRole('link', { name: 'Player', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(menu.getByRole('button', { name: 'Fechar menu', exact: true })).toBeFocused()
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      expect(await menu.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    await menu.getByRole('button', { name: 'Fechar menu', exact: true }).focus()
    await page.keyboard.press('ArrowDown')
    await expect(menu.getByRole('link', { name: 'Buscar músicas', exact: true })).toBeFocused()
    for (const theme of ['dark', 'light']) {
      if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== theme)
        await menu
          .getByRole('button', { name: theme === 'light' ? 'Usar tema claro' : 'Usar tema escuro' })
          .click()
      await expect(menu).toBeVisible()
      expect(await menu.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden')
      await menu.locator('.menu-body').evaluate((el) => el.scrollTo(0, 0))
      await expect(menu.getByRole('link', { name: 'Buscar músicas', exact: true })).toHaveCSS(
        'background-color',
        theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(25, 28, 31)',
      )
      await menu.evaluate(async (el) => {
        await Promise.all(
          el
            .getAnimations({ subtree: true })
            .map((animation) => animation.finished.catch(() => {})),
        )
      })
      if (width === 320 || width === 1280 || height === 320)
        await page.screenshot({ path: 'test-results/menu-' + width + '-' + theme + '.png' })
    }
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(trigger).toBeFocused()
    await expect(page.locator('.header-persistent .screen-sound-button')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  }
  // Desktop e tablets com espaço usam botões em linha; os limites consideram
  // as ações adicionais do host/player e a largura útil, sem duplicar controles.
  for (const path of ['/player', '/busca', '/host']) {
    await page.goto(fixture.base + path)
    if (path === '/host')
      await page.getByRole('button', { name: 'Fechar PIN', exact: true }).click()
    for (const width of [320, 390, 768, 820, 910, 912, 1024, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      const horizontal = path === '/host' ? width >= 1280 : width >= 1024
      const nav = page.locator('header .header-navigation')
      await expect(trigger)[horizontal ? 'toBeHidden' : 'toBeVisible']()
      await expect(nav)[horizontal ? 'toBeVisible' : 'toBeHidden']()
      if (!horizontal) continue
      await expect(nav.getByRole('link')).toHaveCount(3)
      await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('href', path)
      const header = await page.locator('header').boundingBox()
      const brand = await page.locator('header .brand-logo').boundingBox()
      const navigation = await nav.boundingBox()
      const theme = await page.locator('header .theme-toggle').boundingBox()
      expect(brand.x + brand.width + 4).toBeLessThanOrEqual(navigation.x)
      expect(navigation.x + navigation.width).toBeLessThanOrEqual(theme.x)
      expect(theme.x + theme.width).toBeLessThanOrEqual(header.x + header.width)
      for (const link of await nav.getByRole('link').all()) {
        const box = await link.boundingBox()
        expect(Math.abs(box.y + box.height / 2 - (theme.y + theme.height / 2))).toBeLessThan(1)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      for (const themeName of ['dark', 'light']) {
        if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== themeName)
          await page.locator('header .theme-toggle').click()
        await expect(nav.locator('a:not([aria-current])').first()).toHaveCSS(
          'background-color',
          themeName === 'light' ? 'rgb(255, 255, 255)' : 'rgb(25, 28, 31)',
        )
        if (width === 1024 || width === 1280)
          await page.screenshot({
            path: 'test-results/header-' + path.slice(1) + '-' + width + '-' + themeName + '.png',
          })
      }
    }
  }
  await page.goto(fixture.base + '/player')
  await page.setViewportSize({ width: 390, height: 844 })
  await trigger.click()
  await expect(menu).toBeVisible()
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(menu).toBeHidden()
  await expect(page.locator('header [aria-current="page"]')).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  await expect(page.locator('.header-persistent .screen-sound-button')).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await trigger.click()
  await menu.getByRole('link', { name: 'Player', exact: true }).click()
  await expect(menu).toBeHidden()
  await trigger.click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await menu.locator('.menu-content').evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
  await page.keyboard.press('Backspace')
  await expect(menu).toBeHidden()
  await trigger.click()
  await menu.getByRole('link', { name: 'Buscar músicas', exact: true }).click()
  await expect(page).toHaveURL(fixture.base + '/busca')
  await expect(menu).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  await trigger.click()
  await expect(menu.getByRole('link', { name: 'Buscar músicas', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await menu.getByRole('link', { name: 'Anfitrião', exact: true }).click()
  await expect(page).toHaveURL(fixture.base + '/host')
  const pin = page.getByRole('dialog', { name: 'Liberar controle da festa', exact: true })
  await expect(pin).toBeVisible()
  await expect(menu).toBeHidden()
  await pin.getByRole('button', { name: 'Fechar PIN', exact: true }).click()
  await trigger.click()
  await menu.getByRole('button', { name: 'Liberar controles', exact: true }).click()
  await expect(menu).toBeHidden()
  await expect(pin).toBeVisible()
  await pin.getByLabel('PIN do anfitrião', { exact: true }).fill('4321')
  await pin.getByRole('button', { name: 'Liberar controles', exact: true }).click()
  await expect(pin).toBeHidden()
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(trigger).toBeHidden()
  await expect(
    page.locator('header').getByRole('button', { name: 'Sair do admin', exact: true }),
  ).toBeVisible()
  await page.locator('header').getByRole('button', { name: 'Sair do admin', exact: true }).click()
  await expect(page).toHaveURL(fixture.base + '/busca')
  await expect(menu).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  expect(errors).toEqual([])
  console.log(
    'Menu: compacto em celulares, botões em linha no desktop/tablet, 320–1920px, temas, foco/Tab/setas/Escape, rotação, rotas e PIN/logout OK',
  )
} finally {
  await browser.close()
  await fixture.close()
}
