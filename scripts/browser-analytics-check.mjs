import { chromium, expect } from '@playwright/test'
import { startFixture } from '../tests/helpers/server.mjs'
import { mkdir } from 'node:fs/promises'
const key = 'qroke:analytics-consent:v1'
const id = 'G-16BRNZ1KP8'
const fixture = await startFixture(3267, {
  NUXT_ACCESS_REQUIRED: 'true',
  NUXT_PUBLIC_GA_MEASUREMENT_ID: id,
})
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
try {
  await mkdir('test-results', { recursive: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const googleRequests = []
  const commands = []
  await context.exposeBinding('recordAnalytics', (_source, command) => commands.push(command))
  await context.route('https://www.googletagmanager.com/**', async (route) => {
    googleRequests.push(route.request().url())
    expect(route.request().headers().referer).toBeUndefined()
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
      for (const command of window.dataLayer) window.recordAnalytics(Array.from(command));
      const push = window.dataLayer.push.bind(window.dataLayer);
      window.dataLayer.push = function(command) { window.recordAnalytics(Array.from(command)); return push(command); };
      document.cookie = '_ga=test; path=/';
    `,
    })
  })
  await context.route(/https:\/\/[^/]*google-analytics\.com\//, (route) => {
    throw new Error('Unexpected live collection: ' + route.request().url())
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const views = () => commands.filter((c) => c[0] === 'event' && c[1] === 'page_view')
  await page.goto(fixture.base + '/?token=private-query#private-hash')
  await expect(page.getByRole('heading', { name: 'Ajude o QRokê a melhorar' })).toBeVisible()
  expect(googleRequests).toHaveLength(0)
  await expect(page.locator('iframe[src="/analytics-frame"]')).toHaveCount(0)
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/analytics-consent-dark.png' })
  await page.evaluate(() => localStorage.setItem('qroke:theme:/', 'light'))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Ajude o QRokê a melhorar' })).toBeVisible()
  await page.screenshot({ path: 'test-results/analytics-consent-light.png' })
  await page.getByRole('button', { name: 'Recusar medição', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Preferências de medição' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ajude o QRokê a melhorar' })).toHaveCount(0)
  expect(googleRequests).toHaveLength(0)
  await page.getByRole('button', { name: 'Preferências de medição' }).click()
  await expect(page.getByRole('complementary', { name: 'Ajude o QRokê a melhorar' })).toBeFocused()
  await page.getByRole('button', { name: 'Aceitar medição', exact: true }).click()
  await expect.poll(() => views().length).toBe(1)
  expect(views()[0][2].page_location).toBe('https://qroke.com.br/')
  expect(googleRequests).toEqual(['https://www.googletagmanager.com/gtag/js?id=' + id])
  expect(commands.find((c) => c[0] === 'config')[2]).toMatchObject({
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: 'none',
  })
  expect(commands.find((c) => c[0] === 'consent')[2]).toMatchObject({
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
  await page.locator('footer').getByRole('link', { name: 'Como funciona', exact: true }).click()
  await expect.poll(() => views().length).toBe(2)
  expect(views()[1][2]).toMatchObject({
    page_location: 'https://qroke.com.br/como-funciona',
    page_referrer: 'https://qroke.com.br/',
  })
  await page.goBack()
  await expect.poll(() => views().length).toBe(3)
  await page.goForward()
  await expect.poll(() => views().length).toBe(4)
  await page.getByRole('button', { name: 'Preferências de medição' }).click()
  await page.getByRole('button', { name: 'Aceitar medição', exact: true }).click()
  expect(views()).toHaveLength(4)
  // The tag's document never sees the app URL, title, forms or history.
  const frame = page.frames().find((f) => f.url().endsWith('/analytics-frame'))
  expect(frame).toBeTruthy()
  expect(
    await frame.evaluate(() => ({
      referrer: document.referrer,
      forms: document.forms.length,
      location: location.pathname,
    })),
  ).toEqual({ referrer: '', forms: 0, location: '/analytics-frame' })
  await page.evaluate(() => {
    const frame = document.querySelector('iframe[src="/analytics-frame"]')
    frame.contentWindow.postMessage(
      {
        type: 'qroke:page-view',
        path: '/f/secret/host',
        referrer: 'https://example.org/?secret=1',
      },
      location.origin,
    )
  })
  await page.getByRole('button', { name: 'Preferências de medição' }).click()
  await page.getByRole('button', { name: 'Recusar medição', exact: true }).click()
  await expect(page.locator('iframe[src="/analytics-frame"]')).toHaveCount(0)
  expect((await context.cookies()).some((c) => c.name.startsWith('_ga'))).toBe(false)
  expect(views()).toHaveLength(4)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Preferências de medição' })).toBeVisible()
  expect(googleRequests).toHaveLength(1)
  // Accepted users still do not load the tag on private entry screens.
  await page.evaluate((key) => localStorage.setItem(key, 'accepted'), key)
  await page.goto(fixture.base + '/entrar?pin=987654#private-invite')
  await expect(page.locator('iframe[src="/analytics-frame"]')).toHaveCount(0)
  expect(googleRequests).toHaveLength(1)
  await page.goto(fixture.base + '/perguntas-frequentes', {
    referer: fixture.base + '/f/private-party/entrar?token=private',
  })
  await expect.poll(() => views().length).toBe(5)
  expect(views()[4][2].page_referrer).toBe('https://qroke.com.br/')
  // Revocation is shared across tabs.
  const other = await context.newPage()
  await other.goto(fixture.base + '/mapa-do-site')
  await expect.poll(() => views().length).toBe(6)
  await other.getByRole('button', { name: 'Preferências de medição' }).click()
  await other.getByRole('button', { name: 'Recusar medição', exact: true }).click()
  await expect(page.locator('iframe[src="/analytics-frame"]')).toHaveCount(0)
  await expect(other.locator('iframe[src="/analytics-frame"]')).toHaveCount(0)
  expect(JSON.stringify(commands)).not.toMatch(/private|secret|987654/)
  const standalone = await context.newPage()
  const before = googleRequests.length
  await standalone.goto(fixture.base + '/analytics-frame')
  expect(googleRequests).toHaveLength(before)
  expect(errors).toEqual([])
  await context.close()
  console.log(
    'Analytics: opt-in, refusal, persisted choice, revocation across tabs, single SPA page views, sanitized URLs/referrers, private screens excluded and responsive themes OK',
  )
} finally {
  await browser.close()
  await fixture.close()
}
const disabled = await startFixture(3267, { NUXT_PUBLIC_GA_MEASUREMENT_ID: '' })
try {
  expect((await fetch(disabled.base + '/analytics-frame')).status).toBe(404)
  const html = await (await fetch(disabled.base)).text()
  expect(html).not.toContain('Preferências de medição')
  console.log('Analytics: empty ID disables integration OK')
} finally {
  await disabled.close()
}
