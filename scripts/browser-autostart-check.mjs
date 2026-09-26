import { chromium, expect } from '@playwright/test'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3196)
const browser = await chromium.launch({
  headless: true,
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
  args: ['--no-sandbox'],
})
try {
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const guestContext = await browser.newContext()
  const page = await hostContext.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await hostContext.request.post(fixture.base + '/api/auth', {
    data: { action: 'login', pin: '4321' },
  })
  await page.goto(fixture.base + '/host')
  await page.getByRole('button', { name: 'Tocar neste dispositivo', exact: true }).click()
  await expect(
    page.getByText('Som ativado. O próximo pedido começa automaticamente.'),
  ).toBeVisible()
  await guestContext.request.post(fixture.base + '/api/guest', { data: { name: 'Convidado' } })
  const search = await guestContext.request.get(fixture.base + '/api/search?q=Faixa&source=local')
  const { tracks } = await search.json()
  for (let i = 0; i < 2; i++) {
    if (i === 1) {
      // Simula navegador que omite o evento; a recuperação deve concluir a faixa.
      await page.evaluate(() =>
        document.addEventListener('ended', (event) => event.stopImmediatePropagation(), {
          capture: true,
          once: true,
        }),
      )

      await page.getByRole('link', { name: 'QR ↗', exact: true }).click()
      await expect(
        page.getByText('Som ativado. O próximo pedido começa automaticamente.'),
      ).toBeVisible()
    }
    const add = await guestContext.request.post(fixture.base + '/api/queue', {
      data: { id: tracks[i].id, source: 'local' },
    })
    expect(add.status()).toBe(200)
    await expect
      .poll(() =>
        page
          .locator('audio')
          .evaluate((a) => !a.paused && a.currentTime > 0.05)
          .catch(() => false),
      )
      .toBe(true)
    await expect
      .poll(
        async () =>
          (await (await hostContext.request.get(fixture.base + '/api/state')).json()).current,
        { timeout: 30000 },
      )
      .toBe(null)
    console.log(
      'Fila vazia: pedido remoto inicia e termina sem clique adicional na rota ' +
        (i ? '/qr' : '/host') +
        ' OK',
    )
  }
  expect(errors).toEqual([])
} finally {
  await browser.close()
  await fixture.close()
}
