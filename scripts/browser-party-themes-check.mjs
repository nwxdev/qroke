import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3290, {
  NUXT_ACCESS_REQUIRED: 'true',
  NUXT_RADIO_DEFAULT: 'true',
  NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3290',
})
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
})
try {
  await mkdir('test-results', { recursive: true })
  const owner = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await owner.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(fixture.base + '/criar-festa')
  await page.getByText('Sonic · Neon Festival', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-party-theme', 'sonic-day')
  await page.getByLabel('Nome da festa', { exact: true }).fill('Velocidade e música')
  await page.getByLabel('Seu nome', { exact: true }).fill('Ana')
  await page.screenshot({ path: 'test-results/sonic-create-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Começar a festa', exact: true }).click()
  await expect(page).toHaveURL(/\/f\/[^/]+\/host$/)
  const id = new URL(page.url()).pathname.split('/')[2],
    api = fixture.base + '/api/f/' + id
  const state = async () => await (await owner.request.get(api + '/state')).json()
  expect((await state()).autoContinue).toBe(true)
  expect((await state()).theme).toBe('sonic-day')
  const html = await (await owner.request.get(page.url())).text()
  expect(html).toContain('data-party-theme="sonic-day"')
  const invitation = await (await owner.request.get(api + '/network/invite')).json()
  const guest = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    g = await guest.newPage()
  g.on('pageerror', (error) => errors.push(error.message))
  await g.goto(invitation.url)
  await expect(g).toHaveURL(/\/busca$/)
  await g.getByRole('textbox', { name: 'Seu nome', exact: true }).fill('Bia')
  await g.getByRole('button', { name: 'Entrar na festa →', exact: true }).click()
  await expect(g.getByRole('combobox', { name: 'Buscar música', exact: true })).toBeVisible()
  await expect(g.locator('html')).toHaveAttribute('data-party-theme', 'sonic-day')
  await expect(g.locator('.party-atmosphere')).toHaveCount(1)
  await expect(g.locator('.sonic-banner')).toBeVisible()
  await expect
    .poll(() =>
      g.locator('.sonic-character').evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBe(true)
  expect(await g.locator('.sonic-character').evaluate((image) => image.currentSrc)).toContain(
    'sonic-480-v1.webp',
  )
  await expect(g.locator('.sonic-ring-canvas')).toHaveClass(/ready/)
  await g.getByRole('button', { name: 'Girar argola do Sonic' }).click()
  const brandFilter = () =>
    g.locator('.brand-header .brand-logo img:visible').evaluate((el) => getComputedStyle(el).filter)
  await expect.poll(brandFilter).toBe('brightness(0) invert(1)')
  expect(await g.evaluate(() => getComputedStyle(document.body).backgroundImage)).toContain(
    'city-dark-960-v1.webp',
  )
  await g.screenshot({ path: 'test-results/sonic-search-dark-mobile.png', fullPage: true })
  await g.setViewportSize({ width: 1440, height: 1000 })
  await g.screenshot({ path: 'test-results/sonic-search-dark-desktop.png', fullPage: true })
  await g.setViewportSize({ width: 390, height: 844 })
  const tokens = () =>
    g.evaluate(() => ({
      root: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      quasar: getComputedStyle(document.body).getPropertyValue('--q-primary').trim(),
      body: getComputedStyle(document.body).fontFamily,
      input: getComputedStyle(document.querySelector('.q-field__native')).fontFamily,
    }))
  await expect.poll(tokens).toMatchObject({ root: '#63b4ff', quasar: '#63b4ff' })
  expect((await tokens()).body).toContain('Manrope')
  expect((await tokens()).input).toContain('DM Sans')
  const checkContrast = async () => {
    const values = await g.evaluate(() => {
      const css = getComputedStyle(document.documentElement)
      const color = (token) => {
        const el = document.createElement('span')
        el.style.color = css.getPropertyValue(token)
        document.body.append(el)
        const value = getComputedStyle(el)
          .color.match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
        el.remove()
        return value
      }
      return {
        bg: color('--bg'),
        text: color('--text'),
        muted: color('--muted'),
        surface: color('--surface'),
        accent: color('--accent'),
        onAccent: color('--on-accent'),
        actualBg: getComputedStyle(document.body).backgroundColor,
      }
    })
    const luminance = (rgb) =>
      rgb
        .map((v) => {
          const n = v / 255
          return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
        })
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
    const ratio = (a, b) => {
      const values = [luminance(a), luminance(b)].sort((a, b) => b - a)
      return (values[0] + 0.05) / (values[1] + 0.05)
    }
    expect(ratio(values.text, values.bg)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(values.muted, values.surface)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(values.onAccent, values.accent)).toBeGreaterThanOrEqual(4.5)
    expect(values.actualBg).toBe(`rgb(${values.bg.join(', ')})`)
  }
  await checkContrast()
  await g.mouse.click(20, 20)
  await g.getByRole('button', { name: 'Usar tema claro', exact: true }).click()
  await expect(g.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect.poll(tokens).toMatchObject({ root: '#155ac3', quasar: '#155ac3' })
  await expect.poll(brandFilter).toBe('brightness(0)')
  expect(await g.evaluate(() => getComputedStyle(document.body).backgroundImage)).toContain(
    'city-light-960-v1.webp',
  )
  await checkContrast()
  await g.screenshot({ path: 'test-results/sonic-search-light-mobile.png', fullPage: true })
  await g.emulateMedia({ reducedMotion: 'reduce' })
  await expect(g.locator('.party-atmosphere')).toHaveCount(0)
  await g.emulateMedia({ reducedMotion: 'no-preference' })
  // Devices that lose their GPU context keep a visible ring and usable controls.
  await g.locator('.sonic-ring-canvas').evaluate((canvas) => {
    canvas.getContext('webgl').getExtension('WEBGL_lose_context').loseContext()
  })
  await expect(g.locator('.sonic-ring-fallback')).toBeVisible()
  await g.getByRole('button', { name: 'Girar argola do Sonic' }).click()

  const tabs = page.getByRole('navigation', { name: 'Gerenciar festa' })
  await tabs.getByRole('button', { name: 'Festa', exact: true }).click()
  const appearance = page.getByRole('region', { name: 'Aparência da festa' })
  await appearance.getByText('QRokê original', { exact: true }).click()
  await appearance.getByRole('button', { name: 'Aplicar tema à festa' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-party-theme', 'classic')
  await expect(page.locator('.sonic-banner')).toHaveCount(0)
  await expect(g.locator('html')).toHaveAttribute('data-party-theme', 'classic', { timeout: 10000 })
  await expect(g.locator('html')).toHaveAttribute('data-theme', 'light')
  await appearance.getByText('Sonic · Neon Festival', { exact: true }).click()
  await appearance.getByRole('button', { name: 'Aplicar tema à festa' }).click()
  await expect(g.locator('html')).toHaveAttribute('data-party-theme', 'sonic-day', {
    timeout: 10000,
  })
  const devices = async () => (await (await owner.request.get(api + '/devices')).json()).devices
  await expect.poll(async () => (await devices()).some((d) => d.guestName === 'Bia')).toBe(true)
  const device = (await devices()).find((d) => d.guestName === 'Bia')
  expect(
    (
      await owner.request.post(api + '/control', {
        data: { action: 'set-dj', deviceId: device.id, enabled: true },
      })
    ).ok(),
  ).toBe(true)
  await g.goto(fixture.base + '/f/' + id + '/host')
  await g
    .getByRole('navigation', { name: 'Gerenciar festa' })
    .getByRole('button', { name: 'Festa', exact: true })
    .click()
  await expect(
    g.getByRole('region', { name: 'Aparência da festa' }).getByRole('radio').first(),
  ).toBeDisabled()
  await expect(g.getByRole('button', { name: 'Aplicar tema à festa' })).toHaveCount(0)
  expect(
    (
      await guest.request.post(api + '/control', { data: { action: 'theme', theme: 'classic' } })
    ).status(),
  ).toBe(403)
  await page.goto(fixture.base + '/f/' + id + '/player')
  await expect(page.locator('.sonic-banner')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/sonic-player-mobile.png', fullPage: true })
  await page.goto(fixture.base + '/f/' + id + '/host')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Expandir tela', exact: true }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  await page.getByRole('button', { name: 'Restaurar tela', exact: true }).click()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
  await page.screenshot({ path: 'test-results/sonic-host-desktop.png', fullPage: true })
  for (const width of [320, 390, 1440]) {
    await g.setViewportSize({ width, height: 900 })
    expect(await g.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await owner.request.post(api + '/control', { data: { action: 'auto', enabled: false } })
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-party-theme', 'sonic-day')
  expect((await state()).autoContinue).toBe(false)
  await page.goto(fixture.base + '/')
  await expect(page.locator('html')).toHaveAttribute('data-party-theme', 'classic')
  await expect(page.locator('.sonic-banner')).toHaveCount(0)
  expect(
    await page
      .locator('.brand-logo img:visible')
      .first()
      .evaluate((el) => getComputedStyle(el).filter),
  ).toBe('none')
  expect(errors).toEqual([])
  console.log(
    'Tema da festa: criação/SSR, dono/DJ, sincronização entre aparelhos, Quasar claro/escuro, fontes legíveis, movimento reduzido, fullscreen, 320–1440px e rádio padrão/persistência OK',
  )
} finally {
  await browser.close()
  await fixture.close()
}
