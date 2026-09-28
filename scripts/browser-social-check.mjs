import { chromium, expect } from '@playwright/test'
import { startFixture, client } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3190, {
  NODE_OPTIONS:
    '--import=' + new URL('../tests/helpers/youtube-fetch.mjs', import.meta.url).pathname,
  NUXT_YOUTUBE_API_KEY: 'fixture-key',
  NUXT_YOUTUBE_CLIENT_ID: 'fixture-client',
  NUXT_YOUTUBE_CLIENT_SECRET: 'fixture-secret',
  NUXT_YOUTUBE_REDIRECT_URI: 'http://127.0.0.1:3190/api/youtube/callback',
})
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.request.post(fixture.base + '/api/guest', { data: { name: 'Ana' } })
  const other = client(fixture.base)
  await other.request('/api/guest', { name: 'Bruno' })
  const tracks = (await other.request('/api/search?q=Faixa&source=local')).data.tracks
  for (const track of tracks.slice(0, 3)) await other.request('/api/queue', track)
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(fixture.base)
  await expect(page.locator('.guest-identity')).toContainText('Ana')
  await expect(page.locator('.party-people')).toContainText('Bruno')
  await page.getByRole('button', { name: 'Editar nome', exact: true }).click()
  await page.getByLabel('Novo nome', { exact: true }).fill('Aninha')
  await page.getByRole('button', { name: 'Salvar nome', exact: true }).click()
  await expect(page.locator('.guest-identity')).toContainText('Aninha')
  await page.getByRole('button', { name: 'Biblioteca local', exact: true }).click()
  await page.getByRole('textbox', { name: 'Buscar música' }).fill('Faixa')
  await page.getByRole('textbox', { name: 'Buscar música' }).press('Enter')
  await expect(page.locator('.results .queued-label')).toHaveCount(3)
  await expect(page.locator('.results li').first()).toContainText('Na fila · #1')
  await expect(page.locator('.results li').first().getByRole('button')).toBeDisabled()
  await page
    .getByRole('button', { name: 'Like para subir na fila: ' + tracks[2].title, exact: true })
    .click()
  await expect(page.locator('.queue-card').first()).toContainText(tracks[2].title)
  await expect(page.locator('.queue-card').first().locator('.queue-vote').first()).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page
    .getByRole('button', { name: 'Retirar meu like: ' + tracks[2].title, exact: true })
    .click()
  await expect(page.locator('.queue-card').first()).toContainText(tracks[0].title)
  await expect(page.locator('.queue-card').first().locator('.queue-vote').first()).toBeDisabled()

  await page
    .getByRole('button', { name: 'Dislike para descer na fila: ' + tracks[0].title, exact: true })
    .click()
  await expect(page.locator('.queue-card').last()).toContainText(tracks[0].title)
  await page
    .getByRole('button', { name: 'Retirar meu dislike: ' + tracks[0].title, exact: true })
    .click()
  await expect(page.locator('.queue-card').first()).toContainText(tracks[0].title)

  await page
    .getByLabel('Link da playlist', { exact: true })
    .fill('https://youtube.com/playlist?list=PLabcdefghijk')
  await page.getByLabel('Link da playlist', { exact: true }).press('Enter')
  await page.getByRole('button', { name: 'Adicionar 2 músicas', exact: true }).click()
  await expect(page.locator('.playlist-success')).toContainText('2 música(s)')
  await expect(page.locator('.playlist-groups summary')).toContainText('Playlist da festa')
  await expect(page.locator('.playlist-groups summary')).toContainText('Aninha')
  await page.locator('.playlist-groups summary').click()
  await expect(page.locator('.playlist-groups li')).toHaveCount(2)
  await expect(page.locator('.queue-card .playlist-badge')).toHaveCount(2)
  const state = await (await context.request.get(fixture.base + '/api/state')).json()
  expect(
    state.queue.filter((item) => item.playlist).every((item) => item.guestName === 'Aninha'),
  ).toBe(true)

  for (const width of [1440, 768, 360, 320]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/party-social-mobile-dark.png', fullPage: true })
  await page.getByRole('button', { name: 'Usar tema claro' }).click()
  await page.screenshot({ path: 'test-results/party-social-mobile-light.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'test-results/party-social-desktop.png', fullPage: true })

  await context.route('https://accounts.google.com/o/oauth2/v2/auth?**', async (route) => {
    const state = new URL(route.request().url()).searchParams.get('state')
    await route.fulfill({
      contentType: 'text/html',
      body:
        '<script>location.href=' +
        JSON.stringify(fixture.base + '/api/youtube/callback?state=' + state + '&code=fixture') +
        '</script>',
    })
  })
  await page.getByRole('button', { name: 'Minha conta', exact: true }).click()
  await page.getByRole('button', { name: 'Conectar YouTube', exact: true }).click()
  await expect(page.locator('.account-playlists li')).toHaveCount(1)
  expect((await (await context.request.get(fixture.base + '/api/session')).json()).admin).toBe(
    false,
  )
  await page.getByRole('button', { name: 'Desconectar', exact: true }).click()

  await context.route('**/api/youtube/status', (route) =>
    route.fulfill({
      json: {
        publicConfigured: true,
        oauthConfigured: true,
        connected: false,
        connectHere: false,
        connectOrigin: 'http://localhost:3100',
      },
    }),
  )
  await page.reload()
  await page.getByRole('button', { name: 'Minha conta', exact: true }).click()
  await expect(page.locator('.playlist-account')).toContainText('login Google pelo celular precisa')
  await expect(page.locator('.playlist-account a')).toHaveCount(0)

  const host = client(fixture.base)
  await host.request('/api/auth', { action: 'login', pin: '4321' })
  const device = (await host.request('/api/device', { label: 'Player de teste' })).data
  await host.request('/api/control', { action: 'assign', deviceId: device.id })
  await expect(page.locator('.results')).toHaveCount(0)
  await page.getByRole('button', { name: 'Biblioteca local', exact: true }).click()
  await page.getByRole('textbox', { name: 'Buscar música' }).fill('Faixa')
  await page.getByRole('textbox', { name: 'Buscar música' }).press('Enter')
  await expect(page.locator('.results')).toContainText('Tocando agora')
  await host.request('/api/control', {
    action: 'skip',
    queueId: (await host.request('/api/state')).data.current.queueId,
  })
  const before = (await host.request('/api/state')).data.current.id
  await host.request('/api/auth', { action: 'logout' })
  await context.request.post(fixture.base + '/api/auth', { data: { action: 'login', pin: '4321' } })
  await page.goto(fixture.base + '/host')
  await page.getByRole('button', { name: 'Música anterior', exact: true }).click()
  const after = (await host.request('/api/state')).data
  expect(after.current.id).not.toBe(before)
  expect(after.queue[0].id).toBe(before)
  expect(errors).toEqual([])
  console.log(
    'Participantes: nome, presença, voto e retirada, dedupe/posição, playlist de convidado, OAuth sem PIN, aviso mobile, música anterior e layouts 320–1440 aprovados.',
  )
} finally {
  await browser.close()
  await fixture.close()
}
