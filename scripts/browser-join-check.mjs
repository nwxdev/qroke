import { chromium, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import QRCode from 'qrcode'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3233, {
  NUXT_ACCESS_REQUIRED: 'true',
  NUXT_PUBLIC_PARTY_URL: 'http://127.0.0.1:3233',
})
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
await mkdir('test-results', { recursive: true })
try {
  const owner = await browser.newContext()
  await owner.request.get(fixture.base)
  const created = await owner.request.post(fixture.base + '/api/parties', {
    data: { name: 'Festa do QR', pin: '123456', idempotencyKey: randomUUID() },
  })
  expect(created.status()).toBe(201)
  const party = (await created.json()).party
  const prefix = fixture.base + '/api/f/' + party.id
  const invite = (await (await owner.request.get(prefix + '/network/invite')).json()).url
  expect(invite).toContain('#convite=')
  const qr = await QRCode.toDataURL(invite, { width: 480, margin: 4 })
  const context = await browser.newContext({ viewport: { width: 320, height: 740 } })
  await context.addInitScript(() => {
    window.cameraMode = 'NotAllowedError'
    window.cameraCalls = []
    window.cameraTracks = []
    window.makeCameraStream = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 480
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, 480, 480)
      if (window.qrImage) {
        const image = new Image()
        image.src = window.qrImage
        await image.decode()
        ctx.drawImage(image, 0, 0)
      }
      // Exercise the production decoder against actual video frames.
      window.cameraCanvas = canvas
      const stream = canvas.captureStream(10)
      window.cameraTracks.push(...stream.getTracks())
      return stream
    }
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async (constraints) => {
        window.cameraCalls.push(constraints)
        if (window.cameraMode === 'pending')
          return new Promise((resolve) => {
            window.resolveCamera = resolve
          })
        if (window.cameraMode !== 'stream')
          throw new DOMException('Simulated permission/device response', window.cameraMode)
        return window.makeCameraStream()
      },
    })
    Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
      value: async () => [],
    })
  })
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(fixture.base)
  const dialog = page.getByRole('dialog', { name: 'Entrar na festa', exact: true })
  const homeButton = page.getByRole('button', { name: 'Entrar na festa', exact: true })
  await expect(homeButton).toBeEnabled()
  expect(await page.evaluate(() => window.cameraCalls.length)).toBe(0)
  await page.screenshot({ path: 'test-results/join-home-mobile.png', fullPage: true })
  await homeButton.click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Fechar entrada na festa' })).toBeFocused()
  expect(await page.evaluate(() => window.cameraCalls.length)).toBe(0)
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  }
  await dialog
    .getByLabel('Link da festa', { exact: true })
    .fill('https://example.org/f/test#convite=bad')
  await dialog.getByRole('button', { name: 'Entrar com link', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('QRokê neste site')
  expect(page.url()).toBe(fixture.base + '/')
  await page.screenshot({ path: 'test-results/join-dialog-mobile.png' })
  // A refusal never loops on permissions, and pasting remains available.
  await dialog.getByRole('button', { name: 'Escanear QR Code' }).click()
  await expect(dialog.getByRole('status')).toContainText('não foi autorizada')
  expect(await page.evaluate(() => window.cameraCalls.length)).toBe(1)
  expect(await page.evaluate(() => window.cameraCalls[0])).toMatchObject({ audio: false })
  await dialog.getByText('Como liberar a câmera', { exact: true }).click()
  await expect(dialog.getByText(/permissões de qroke.com.br/)).toBeVisible()
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/join-camera-denied-mobile.png' })
  for (const [mode, message] of [
    ['NotFoundError', 'Não encontramos uma câmera'],
    ['NotReadableError', 'Feche outros aplicativos'],
    ['OverconstrainedError', 'Escolha outra'],
  ]) {
    await page.evaluate((value) => {
      window.cameraMode = value
    }, mode)
    await dialog.getByRole('button', { name: 'Tentar câmera novamente' }).click()
    await expect(dialog.getByRole('status')).toContainText(message)
  }
  await dialog.getByRole('button', { name: 'Usar link da festa' }).click()
  await dialog.getByLabel('Link da festa', { exact: true }).fill(invite.split('#')[0])
  await dialog.getByRole('button', { name: 'Entrar com link', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('convite completo')
  await dialog
    .getByLabel('Link da festa', { exact: true })
    .fill(invite.split('#')[0] + '#convite=wrong')
  await dialog.getByRole('button', { name: 'Entrar com link', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Convite inválido ou expirado')
  // Closing before permission is answered must also release a late stream.
  await page.evaluate(() => {
    window.cameraMode = 'pending'
  })
  await dialog.getByRole('button', { name: 'Escanear QR Code' }).click()
  await expect.poll(() => page.evaluate(() => !!window.resolveCamera)).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(homeButton).toBeFocused()
  await page.evaluate(async () => window.resolveCamera(await window.makeCameraStream()))
  await expect
    .poll(() =>
      page.evaluate(() => window.cameraTracks.every((track) => track.readyState === 'ended')),
    )
    .toBe(true)
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
  // Leaving the app suspends the camera; resuming requires an explicit tap.
  await homeButton.click()
  await page.evaluate(() => {
    window.cameraMode = 'stream'
  })
  await dialog.getByRole('button', { name: 'Escanear QR Code' }).click()
  await expect(dialog.getByRole('status')).toContainText('Aponte para')
  await page.screenshot({ path: 'test-results/join-camera-mobile.png' })
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(dialog.getByRole('button', { name: 'Retomar câmera' })).toBeVisible()
  expect(
    await page.evaluate(() => window.cameraTracks.every((track) => track.readyState === 'ended')),
  ).toBe(true)
  await page.evaluate(() => {
    delete document.hidden
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(dialog.getByRole('button', { name: 'Retomar câmera' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Retomar câmera' }).click()
  await expect(dialog.getByRole('status')).toContainText('Aponte para')
  await dialog.getByRole('button', { name: 'Usar link da festa' }).click()
  expect(
    await page.evaluate(() => window.cameraTracks.every((track) => track.readyState === 'ended')),
  ).toBe(true)
  // A real invitation grants the selected party, and the token stays out of the URL.
  await dialog.getByLabel('Link da festa', { exact: true }).fill(invite)
  await dialog.getByRole('button', { name: 'Entrar com link', exact: true }).click()
  await expect(page).toHaveURL(fixture.base + '/f/' + party.id + '/busca')
  expect(page.url()).not.toContain('convite=')
  await page.getByLabel('Seu nome', { exact: true }).fill('Convidado pelo link')
  await page.getByRole('button', { name: 'Entrar na festa →', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Sua identidade na festa' })).toContainText(
    'Convidado pelo link',
  )
  // Menu entry works from an existing party, preserves owner access, and reads live QR frames.
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
  await page.getByRole('button', { name: 'Entrar na festa', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Menu da festa' })).toBeHidden()
  await page.evaluate((data) => {
    window.cameraMode = 'stream'
    window.qrImage = data
  }, qr)
  await dialog.getByRole('button', { name: 'Escanear QR Code' }).click()
  await expect(dialog).toBeHidden({ timeout: 10000 })
  expect(await page.evaluate(() => window.cameraTracks.length)).toBeGreaterThan(0)
  expect(
    await page.evaluate(() => window.cameraTracks.every((track) => track.readyState === 'ended')),
  ).toBe(true)
  expect((await (await context.request.get(prefix + '/access')).json()).role).toBe('guest')
  // An unjoined party exposes the same entry flow alongside the host PIN.
  const fresh = await browser.newContext()
  const entry = await fresh.newPage()
  await entry.goto(fixture.base + '/f/' + party.id + '/entrar')
  await entry.getByRole('button', { name: 'Entrar com link ou QR Code' }).click()
  await expect(entry.getByRole('dialog', { name: 'Entrar na festa', exact: true })).toBeVisible()
  // Owner follows an invitation without losing ownership.
  const host = await owner.newPage()
  await host.goto(fixture.base)
  await host.getByRole('button', { name: 'Entrar na festa', exact: true }).click()
  const hostDialog = host.getByRole('dialog', { name: 'Entrar na festa', exact: true })
  await hostDialog.getByLabel('Link da festa', { exact: true }).fill(invite)
  await hostDialog.getByRole('button', { name: 'Entrar com link', exact: true }).click()
  await expect(host).toHaveURL(fixture.base + '/f/' + party.id + '/host')
  expect((await (await owner.request.get(prefix + '/access')).json()).role).toBe('owner')
  // Installed PWA/iPhone guidance and unsupported-browser fallback stay actionable.
  const installed = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
  })
  await installed.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async () => {
        throw new DOMException('Denied', 'NotAllowedError')
      },
    })
  })
  const app = await installed.newPage()
  await app.goto(fixture.base)
  await app.getByRole('button', { name: 'Entrar na festa', exact: true }).click()
  const appDialog = app.getByRole('dialog', { name: 'Entrar na festa', exact: true })
  await appDialog.getByRole('button', { name: 'Escanear QR Code' }).click()
  await appDialog.getByText('Como liberar a câmera', { exact: true }).click()
  await expect(appDialog.getByText(/No iPhone/)).toBeVisible()
  await expect(appDialog.getByText(/No aplicativo instalado/)).toBeVisible()
  await appDialog.getByRole('button', { name: 'Usar link da festa' }).click()
  await app.evaluate(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: undefined })
  })
  await appDialog.getByRole('button', { name: 'Escanear QR Code' }).click()
  await expect(appDialog.getByRole('status')).toContainText('Este navegador não permite')
  await appDialog.getByRole('button', { name: 'Usar link da festa' }).click()
  await expect(appDialog.getByLabel('Link da festa', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await installed.close()
  expect(errors).toEqual([])
  await fresh.close()
  await context.close()
  await owner.close()
  console.log(
    'Entrada por link/QR: início, menu, PIN, convites, permissões, foco, leitura real de frames, câmera encerrada/pausada e papéis preservados OK',
  )
} finally {
  await browser.close()
  await fixture.close()
}
