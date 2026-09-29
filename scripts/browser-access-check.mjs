import { chromium, expect } from '@playwright/test'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3182, {
  NUXT_ACCESS_REQUIRED: 'true',
  NUXT_HOST_PIN: '4321',
  NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3182',
})
const second = await startFixture(3185, {
  NUXT_ACCESS_REQUIRED: 'true',
  NUXT_HOST_PIN: '4321',
  NUXT_PUBLIC_PARTY_URL: fixture.base,
  NUXT_MONGODB_DATABASE: fixture.databaseName,
})
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
try {
  const hostContext = await browser.newContext({ viewport: { width: 360, height: 800 } })
  const page = await hostContext.newPage()
  await page.goto(fixture.base + '/host')
  await expect(page).toHaveURL(/\/entrar/)
  await expect(page.getByRole('heading', { name: 'Entre na festa' })).toBeVisible()
  await page.screenshot({ path: 'test-results/production-entry-mobile.png', fullPage: true })
  await page.getByLabel('Acesso do anfitrião').fill('4321')
  await page.getByRole('button', { name: 'Entrar como anfitrião' }).click()
  await expect(page).toHaveURL(/\/host/)
  await expect(page.getByRole('button', { name: 'Gerar novo convite da festa' })).toBeVisible()
  // Connect to the other process; mutations below are handled by the first process.
  await page.evaluate(async (base) => {
    window.qrokeSocket = new WebSocket(base.replace('http:', 'ws:') + '/ws')
    window.qrokeChanges = 0
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket did not open')), 5000)
      window.qrokeSocket.onmessage = ({ data }) => {
        if (JSON.parse(data).type === 'changed') {
          window.qrokeChanges++
          clearTimeout(timeout)
          resolve()
        }
      }
      window.qrokeSocket.onerror = reject
    })
  }, second.base)
  const changes = await page.evaluate(() => window.qrokeChanges)
  expect(
    (
      await hostContext.request.post(fixture.base + '/api/guest', { data: { name: 'Anfitrião' } })
    ).ok(),
  ).toBe(true)
  await expect.poll(() => page.evaluate(() => window.qrokeChanges)).toBeGreaterThan(changes)
  const invite = await (await hostContext.request.get(fixture.base + '/api/network/invite')).json()
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const guest = await guestContext.newPage()
  await guest.goto(invite.url)
  await expect(guest).toHaveURL(/\/busca/)
  expect(guest.url()).not.toContain('convite=')
  expect((await guestContext.request.get(fixture.base + '/api/state')).status()).toBe(200)
  const qrHostContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const qrHost = await qrHostContext.newPage()
  await qrHost.goto(invite.url)
  await expect(qrHost).toHaveURL(/\/busca/)
  const identity = await (
    await qrHostContext.request.post(fixture.base + '/api/guest', {
      data: { name: 'Anfitrião via QR' },
    })
  ).json()
  await qrHost.goto(fixture.base + '/host')
  const dialog = qrHost.getByRole('dialog', { name: 'Liberar controle da festa' })
  const hostPin = dialog.getByLabel('PIN do anfitrião')
  await expect(hostPin).toBeDisabled()
  await expect(dialog).toContainText('Outro anfitrião está no controle')
  expect(
    (
      await hostContext.request.post(fixture.base + '/api/auth', { data: { action: 'logout' } })
    ).ok(),
  ).toBe(true)
  await expect(hostPin).toBeEnabled({ timeout: 10000 })
  await hostPin.fill('0000')
  await dialog.getByRole('button', { name: 'Liberar controles' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('PIN incorreto.')
  expect((await (await qrHostContext.request.get(fixture.base + '/api/access')).json()).role).toBe(
    'guest',
  )
  await hostPin.fill('4321')
  await dialog.getByRole('button', { name: 'Liberar controles' }).click()
  await expect(qrHost.locator('.admin-status')).toContainText('Admin liberado')
  const session = await (await qrHostContext.request.get(second.base + '/api/session')).json()
  expect(session.admin).toBe(true)
  expect(session.guest.id).toBe(identity.id)
  expect(
    (
      await qrHostContext.request.post(second.base + '/api/control', {
        data: { action: 'mode', mode: 'music' },
      })
    ).ok(),
  ).toBe(true)
  await qrHost.screenshot({ path: 'test-results/qr-host-mobile.png', fullPage: true })
  await qrHost.getByRole('button', { name: 'Abrir menu' }).click()
  await qrHost.getByRole('button', { name: 'Sair do admin' }).click()
  await expect(qrHost).toHaveURL(/\/busca/)
  expect(
    (
      await hostContext.request.post(fixture.base + '/api/auth', {
        data: { action: 'login', pin: '4321' },
      })
    ).ok(),
  ).toBe(true)
  await page.goto(fixture.base + '/host')
  await expect(page.getByRole('button', { name: 'Gerar novo convite da festa' })).toBeVisible()
  const [rotation] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/invite')),
    page.getByRole('button', { name: 'Gerar novo convite da festa' }).click(),
  ])
  expect(rotation.ok()).toBe(true)
  await expect(guest).toHaveURL(/\/entrar/, { timeout: 10000 })
  await guest.screenshot({ path: 'test-results/production-invite-expired.png', fullPage: true })
  console.log(
    'Acesso público: entrada protegida, PIN, promoção a anfitrião pelo QR, controle exclusivo, convite, remoção do segredo da URL, revogação e WebSocket entre instâncias aprovados.',
  )
} finally {
  await browser.close()
  await second.close()
  await fixture.close()
}
