import { chromium, expect } from '@playwright/test'
import { startFixture } from '../tests/helpers/server.mjs'
import { openFixtureDatabase } from '../tests/helpers/database.mjs'
import { mkdir } from 'node:fs/promises'
const fixture = await startFixture(3222, {
  NUXT_ACCESS_REQUIRED: 'true',
  NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3222',
})
const db = await openFixtureDatabase(fixture.dir)
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
await mkdir('test-results', { recursive: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  })
  const a = await context.newPage(),
    errors = []
  a.on('pageerror', (e) => errors.push(e.message))
  await a.goto(fixture.base)
  await expect(a.getByRole('heading', { name: 'Sua próxima festa começa aqui.' })).toBeVisible()
  await a.screenshot({ path: 'test-results/multisession-home-desktop.png', fullPage: true })
  await a.getByLabel('Nome da festa', { exact: true }).fill('Sextou na casa da Ana')
  await a.getByLabel('PIN do administrador', { exact: true }).fill('123456')
  await a.getByLabel('Confirmar PIN').fill('654321')
  await a.getByRole('button', { name: 'Criar festa', exact: true }).click()
  await expect(a.getByRole('alert')).toHaveText('Os PINs precisam ser iguais.')
  await a.getByLabel('Confirmar PIN').fill('123456')
  await a.getByRole('button', { name: 'Criar festa', exact: true }).click()
  await expect(a).toHaveURL(/\/f\/[^/]+\/host$/)
  const idA = new URL(a.url()).pathname.split('/')[2],
    apiA = fixture.base + '/api/f/' + idA
  await expect(a.locator('.party-session-banner')).toContainText('Sextou na casa da Ana')
  await expect(a.locator('.admin-status')).toContainText('Admin liberado')
  await a.screenshot({ path: 'test-results/multisession-host-desktop.png', fullPage: true })
  const inviteA = (await (await context.request.get(apiA + '/network/invite')).json()).url
  const b = await context.newPage()
  b.on('pageerror', (e) => errors.push(e.message))
  await b.setViewportSize({ width: 360, height: 800 })
  await b.goto(fixture.base)
  await expect(b.getByRole('heading', { name: 'Suas festas' })).toBeVisible()
  await expect(b.getByRole('link', { name: 'Retomar festa Sextou na casa da Ana' })).toBeVisible()
  await b.screenshot({ path: 'test-results/multisession-home-mobile.png', fullPage: true })
  await b.getByLabel('Nome da festa', { exact: true }).fill('Karaokê do sábado')
  await b.getByLabel('PIN do administrador', { exact: true }).fill('654321')
  await b.getByLabel('Confirmar PIN').fill('654321')
  await b.getByRole('button', { name: 'Criar festa', exact: true }).click()
  await expect(b).toHaveURL(/\/f\/[^/]+\/host$/)
  const idB = new URL(b.url()).pathname.split('/')[2],
    apiB = fixture.base + '/api/f/' + idB
  expect(idA).not.toBe(idB)
  await expect(b.locator('.admin-status')).toContainText('Admin liberado')
  await expect(a.locator('.admin-status')).toContainText('Admin liberado')
  await expect(a.locator('.party-session-banner')).toContainText('Sextou na casa da Ana')
  expect((await (await context.request.get(apiA + '/session')).json()).admin).toBe(true)
  expect((await (await context.request.get(apiB + '/session')).json()).admin).toBe(true)
  await a.getByRole('link', { name: 'Player', exact: true }).click()
  await expect(a).toHaveURL(new RegExp('/f/' + idA + '/player$'))
  await expect(a.locator('.qr-plate svg')).toBeVisible()
  await a.bringToFront()
  await a.getByRole('button', { name: 'Compartilhar convite', exact: true }).click()
  await expect(a.getByRole('button', { name: 'Link copiado', exact: true })).toBeVisible()
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const guest = await guestContext.newPage()
  guest.on('pageerror', (e) => errors.push(e.message))
  const socketUrls = []
  guest.on('websocket', (socket) => socketUrls.push(socket.url()))
  await guest.goto(inviteA)
  await expect(guest).toHaveURL(new RegExp('/f/' + idA + '/busca$'))
  expect(guest.url()).not.toContain('convite=')
  await guest.getByLabel('Seu nome', { exact: true }).fill('Convidada Ana')
  await guest.getByRole('button', { name: 'Entrar na festa →' }).click()
  await expect(guest.getByRole('region', { name: 'Sua identidade na festa' })).toContainText(
    'Convidada Ana',
  )
  expect((await guestContext.request.get(apiB + '/state')).status()).toBe(401)
  await expect.poll(() => socketUrls.some((url) => url.includes('festa=' + idA))).toBe(true)
  await guest.getByRole('button', { name: 'Biblioteca local', exact: true }).click()
  await guest.getByRole('textbox', { name: 'Buscar música' }).fill('Faixa')
  await guest.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(guest.locator('.results li')).toHaveCount(7)
  await guest.locator('.results .add-button').first().click()
  await expect
    .poll(async () => (await (await context.request.get(apiA + '/state')).json()).queue.length)
    .toBe(1)
  expect((await (await context.request.get(apiB + '/state')).json()).queue.length).toBe(0)
  await guest.screenshot({ path: 'test-results/multisession-guest-mobile.png', fullPage: true })
  await a.goto(fixture.base + '/f/' + idA + '/host')
  await a.getByRole('button', { name: 'Encerrar festa', exact: true }).click()
  await expect(a.getByRole('dialog', { name: 'Encerrar Sextou na casa da Ana?' })).toBeVisible()
  await a.getByRole('button', { name: 'Continuar festa' }).click()
  expect((await context.request.get(apiA + '/state')).status()).toBe(200)
  await a.getByRole('button', { name: 'Encerrar festa', exact: true }).click()
  await a.getByRole('button', { name: 'Sim, encerrar festa' }).click()
  await expect(a).toHaveURL(new RegExp('/f/' + idA + '/encerrada$'))
  await expect(guest).toHaveURL(new RegExp('/f/' + idA + '/encerrada$'), { timeout: 10000 })
  await expect(b.locator('.party-session-banner')).toContainText('Karaokê do sábado')
  expect((await context.request.get(apiB + '/state')).status()).toBe(200)
  await guest.screenshot({ path: 'test-results/multisession-ended-mobile.png', fullPage: true })
  await a.goto(fixture.base)
  await expect(a.getByRole('link', { name: 'Retomar festa Karaokê do sábado' })).toBeVisible()
  await expect(a.getByRole('link', { name: 'Retomar festa Sextou na casa da Ana' })).toHaveCount(0)
  await db.db
    .collection('parties')
    .updateOne({ _id: 'nwx:' + idB }, { $set: { expiresAt: new Date(Date.now() + 3500) } })
  await expect(b).toHaveURL(new RegExp('/f/' + idB + '/encerrada$'), { timeout: 10000 })
  expect(errors).toEqual([])
  console.log(
    'Multissessão no navegador: criação, PIN, Suas festas, duas abas, QR, compartilhamento, fila isolada, encerramento e expiração aprovados.',
  )
} finally {
  await browser.close()
  await db.close()
  await fixture.close()
}
