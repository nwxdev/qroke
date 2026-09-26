import { chromium, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import Database from 'better-sqlite3'
import { join } from 'node:path'
import { startFixture } from '../tests/helpers/server.mjs'
const server = await startFixture(3198)
const browser = await chromium.launch({
  headless: true,
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
  args: ['--no-sandbox'],
})
const errors = []
await mkdir('test-results', { recursive: true })
function watch(page) {
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().includes('Hydration')) errors.push(m.text())
  })
}
try {
  const guestContext = await browser.newContext({ viewport: { width: 360, height: 800 } })
  const guest = await guestContext.newPage()
  watch(guest)
  await guest.goto(server.base)
  await guest.getByLabel('Seu nome', { exact: true }).fill('Ana')
  await guest.getByRole('button', { name: 'Entrar na festa' }).click()
  await expect(guest.getByRole('heading', { name: 'Oi, Ana' })).toBeVisible()
  await guest.getByRole('button', { name: 'Biblioteca local', exact: true }).click()
  await guest.getByRole('textbox', { name: 'Buscar música', exact: true }).fill('Faixa')
  await guest.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(guest.getByLabel('Adicionar Faixa 1 à fila')).toBeVisible()
  for (let i = 1; i <= 5; i++) {
    await guest.getByLabel('Adicionar Faixa ' + i + ' à fila').click()
    await expect(guest.getByLabel('Adicionar Faixa ' + i + ' à fila')).toBeDisabled()
  }
  expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await guest.screenshot({ path: 'test-results/mobile.png', fullPage: true })
  console.log('Mobile 360px: nome, busca, cinco pedidos e ausência de overflow OK')

  await expect(
    guest.getByText('Aguardando o anfitrião ativar o som.', { exact: false }),
  ).toBeVisible()
  const hostContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const host = await hostContext.newPage()
  watch(host)
  await host.goto(server.base + '/host')
  await host.getByLabel('PIN do anfitrião', { exact: true }).fill('4321')
  await host.getByRole('button', { name: 'Liberar controles', exact: true }).click()
  await expect(host.getByText('Admin liberado', { exact: true })).toBeVisible()
  await host.getByRole('button', { name: 'Tocar neste dispositivo', exact: true }).click()
  await expect(host.locator('audio')).toBeVisible()
  await expect.poll(() => host.locator('audio').evaluate((a) => !a.paused)).toBe(true)
  const first = (await (await host.request.get(server.base + '/api/state')).json()).current.queueId
  await expect
    .poll(
      async () =>
        (await (await host.request.get(server.base + '/api/state')).json()).current?.queueId,
      { timeout: 15000 },
    )
    .not.toBe(first)
  await host.getByRole('button', { name: 'Pausar', exact: false }).click()
  await expect.poll(() => host.locator('audio').evaluate((a) => a.paused)).toBe(true)
  await host.evaluate(() => {
    window.originalAudio = document.querySelector('audio')
  })
  const expiryDb = new Database(join(server.dir, 'party.sqlite'))
  expiryDb.prepare('UPDATE admins SET last_active=0').run()
  expiryDb.close()
  await expect(host.getByLabel('PIN do anfitrião', { exact: true })).toBeVisible()
  expect(
    await host.evaluate(
      () =>
        window.originalAudio === document.querySelector('audio') &&
        window.originalAudio.isConnected,
    ),
  ).toBe(true)
  await host.getByLabel('PIN do anfitrião', { exact: true }).fill('4321')
  await host.getByRole('button', { name: 'Liberar controles', exact: true }).click()
  await expect(host.getByText('Admin liberado', { exact: true })).toBeVisible()
  console.log('Expiração admin preserva a instância do PLAYER OK')
  const beforeDrag = (await (await host.request.get(server.base + '/api/state')).json()).queue
  await host.getByText('Reordenar arrastando', { exact: true }).click()
  const handles = host.locator('.drag-handle')
  const from = await handles.first().boundingBox()
  const to = await host.locator('.drag-row').last().boundingBox()
  await host.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await host.mouse.down()
  await host.mouse.move(to.x + to.width / 2, to.y + to.height - 3, { steps: 15 })
  await host.waitForTimeout(2300)
  await host.mouse.up()
  await expect
    .poll(
      async () =>
        (await (await host.request.get(server.base + '/api/state')).json()).queue.at(-1)?.queueId,
    )
    .toBe(beforeDrag[0].queueId)
  await host.getByRole('button', { name: 'Voltar ao rodízio', exact: true }).click()
  await host.getByText('Reordenar arrastando', { exact: true }).click()
  console.log('Arrasto preservado durante polling e retorno ao rodízio OK')
  await host.screenshot({ path: 'test-results/host.png', fullPage: true })
  console.log('Host: PIN, seleção de PLAYER, áudio real, avanço e pausa OK')
  const originalId = await host.evaluate(
    () => JSON.parse(sessionStorage.getItem('qroke:device')).id,
  )
  const popupPromise = host.waitForEvent('popup')
  await host.evaluate(() => window.open('/host', '_blank'))
  const popup = await popupPromise
  watch(popup)
  await expect
    .poll(() =>
      popup.evaluate(() => JSON.parse(sessionStorage.getItem('qroke:device') || 'null')?.id),
    )
    .toMatch(/^[0-9a-f-]{36}$/)
  await expect
    .poll(() =>
      popup.evaluate(() => JSON.parse(sessionStorage.getItem('qroke:device') || 'null')?.id),
    )
    .not.toBe(originalId)
  await popup.close()
  console.log('Aba duplicada recebe outra credencial de PLAYER OK')

  const tvContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const tv = await tvContext.newPage()
  watch(tv)
  await tv.goto(server.base + '/tv')
  await tv.getByRole('button', { name: 'Liberar controles', exact: true }).focus()
  await tv.keyboard.press('Enter')
  for (const digit of ['4', '3', '2', '1']) await tv.keyboard.press(digit)
  // Usa o grafo de setas do D-pad para alcançar o botão OK.
  async function reachableButtons() {
    const buttons = tv.locator('button:visible:not([disabled])')
    const count = await buttons.count(),
      visited = new Set([0]),
      todo = [0]
    while (todo.length) {
      const from = todo.shift()
      for (const key of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']) {
        await buttons.nth(from).focus()
        await tv.keyboard.press(key)
        const index = await buttons.evaluateAll((nodes) => nodes.indexOf(document.activeElement))
        if (index >= 0 && !visited.has(index)) {
          visited.add(index)
          todo.push(index)
        }
      }
    }
    expect(visited.size).toBe(count)
    return count
  }
  console.log('TV: ' + (await reachableButtons()) + ' botões alcançáveis pelas setas (PIN)')
  await tv.getByRole('button', { name: 'OK', exact: true }).focus()
  await tv.keyboard.press('Enter')
  await expect(tv.getByText('Admin liberado', { exact: true })).toBeVisible()
  await tv.getByRole('button', { name: 'Controles', exact: true }).focus()
  await tv.keyboard.press('Enter')
  console.log('TV: ' + (await reachableButtons()) + ' botões alcançáveis pelas setas (admin)')
  await tv.screenshot({ path: 'test-results/tv.png', fullPage: true })
  await tv.keyboard.press('Backspace')
  await expect(tv.getByRole('button', { name: 'Pular', exact: false })).not.toBeVisible()
  const original = await tv.evaluate(() => document.documentElement.dataset.theme)
  await tv.getByRole('button', { name: 'Usar tema claro' }).click()
  await tv.reload()
  await expect.poll(() => tv.evaluate(() => document.documentElement.dataset.theme)).toBe('light')
  expect(await host.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
  expect(original).toBe('dark')
  console.log('Temas persistidos por rota e Back do controle OK')

  const qr = await guestContext.newPage()
  watch(qr)
  await qr.goto(server.base + '/qr')
  await expect(qr.locator('.qr-plate svg')).toBeVisible()
  await expect(qr.locator('.qr-card a')).toHaveAttribute('href', 'http://192.0.2.10:3198/')
  expect(await qr.locator('.qr-plate').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgb(255, 255, 255)',
  )
  await qr.screenshot({ path: 'test-results/qr.png', fullPage: true })
  // Fallback sem WebSocket: nova aba e pedido chegam via polling.
  await guestContext.routeWebSocket('**/ws', (ws) => ws.close())
  await guest.reload()
  await expect(guest.getByRole('heading', { name: 'Oi, Ana' })).toBeVisible()
  await guest.getByRole('button', { name: 'Biblioteca local', exact: true }).click()
  await guest.getByRole('textbox', { name: 'Buscar música', exact: true }).fill('Faixa 7')
  await guest.getByRole('button', { name: 'Buscar', exact: true }).click()
  await guest.getByLabel('Adicionar Faixa 7 à fila').click()
  await expect(host.locator('.queue-list').getByText('Faixa 7', { exact: true })).toBeVisible({
    timeout: 6000,
  })
  console.log('QR branco, identidade após reload e fallback de polling OK')
  await host.bringToFront()
  await host.evaluate(() => {
    window.audioTrace = []
    for (const name of ['loadedmetadata', 'ended', 'play', 'pause', 'seeking', 'seeked']) {
      document.addEventListener(
        name,
        (event) => {
          if (event.target instanceof HTMLAudioElement) {
            window.audioTrace.push({
              event: name,
              time: event.target.currentTime,
              id: event.target.dataset.queueId?.slice(0, 8),
            })
            if (window.audioTrace.length > 40) window.audioTrace.shift()
          }
        },
        true,
      )
    }
  })
  await host.getByRole('button', { name: 'Continuar', exact: false }).click()
  try {
    const active = await (await host.request.get(server.base + '/api/state')).json()
    let id = active.current?.queueId
    const count = active.queue.length + (id ? 1 : 0)
    for (let i = 0; i < count && id; i++) {
      await expect
        .poll(
          async () =>
            (await (await host.request.get(server.base + '/api/state')).json()).current?.queueId,
          { timeout: Math.max(15000, Number(process.env.QROKE_TEST_TRACK_SECONDS || 2) * 5000) },
        )
        .not.toBe(id)
      console.log('Faixa local concluída:', i + 1, 'de', count)
      id = (await (await host.request.get(server.base + '/api/state')).json()).current?.queueId
    }
    expect((await (await host.request.get(server.base + '/api/state')).json()).current).toBe(null)
  } catch (error) {
    console.log(
      'Diagnóstico áudio:',
      await host
        .locator('audio')
        .evaluate((a) => ({
          paused: a.paused,
          time: a.currentTime,
          duration: a.duration,
          ready: a.readyState,
          error: a.error?.code,
        }))
        .catch(() => null),
    )
    console.log('Avisos:', await host.locator('.media-player .notice').allTextContents())
    console.log('Erros JS:', errors)
    console.log('Eventos:', await host.evaluate(() => window.audioTrace))
    console.log('Estado final:', await (await host.request.get(server.base + '/api/state')).json())
    throw error
  }
  console.log('Fila completa de áudio local toca até o fim sem intervenção OK')
  expect(errors).toEqual([])
  console.log('Sem erros JavaScript ou de hidratação. Capturas em test-results/.')
} finally {
  await browser.close()
  await server.close()
}
