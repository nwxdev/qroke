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
    [1280, 900],
    [568, 320],
  ]) {
    await page.setViewportSize({ width, height })
    await expect(page.locator('.header-menu > button')).toHaveCount(2)
    await expect(page.locator('.header-persistent .screen-sound-button')).toBeVisible()
    const soundBefore = await page.locator('.header-persistent .screen-sound-button').boundingBox()
    const logo = await page.locator('.player-brand').boundingBox()
    const controls = await page.locator('.header-menu').boundingBox()
    expect(logo.x + logo.width).toBeLessThanOrEqual(controls.x)
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(menu).toBeVisible()
    await expect(page.locator('.header-persistent .screen-sound-button')).toBeVisible()
    expect(await page.locator('.header-persistent .screen-sound-button').boundingBox()).toEqual(
      soundBefore,
    )
    await expect(menu.locator('.menu-actions .screen-sound-button')).toBeVisible()
    expect(soundBefore.width).toBeGreaterThanOrEqual(width - 33)
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
    await expect(page.locator('.header-persistent .screen-sound-button')).toBeVisible()
    expect(await page.locator('.header-persistent .screen-sound-button').boundingBox()).toEqual(
      soundBefore,
    )
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  }
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
  await trigger.click()
  await expect(menu.getByRole('button', { name: 'Sair do admin', exact: true })).toBeVisible()
  await menu.getByRole('button', { name: 'Sair do admin', exact: true }).click()
  await expect(page).toHaveURL(fixture.base + '/busca')
  await expect(menu).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  expect(errors).toEqual([])
  console.log(
    'Menu: tela inteira 320–1280px e paisagem, temas, foco/Tab/setas/Escape, movimento reduzido, rotas e PIN/logout OK',
  )
} finally {
  await browser.close()
  await fixture.close()
}
