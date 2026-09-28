import { chromium, expect } from '@playwright/test'
import { startFixture } from '../tests/helpers/server.mjs'
const fixture = await startFixture(3193, {
  NODE_OPTIONS:
    '--import=' + new URL('../tests/helpers/youtube-fetch.mjs', import.meta.url).pathname,
  NUXT_YOUTUBE_API_KEY: 'fixture-key',
  NUXT_YOUTUBE_CLIENT_ID: 'fixture-client',
  NUXT_YOUTUBE_CLIENT_SECRET: 'fixture-secret',
  NUXT_YOUTUBE_REDIRECT_URI: 'http://127.0.0.1:3193/api/youtube/callback',
})
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
  ...(process.env.QROKE_CHROMIUM ? { executablePath: process.env.QROKE_CHROMIUM } : {}),
})
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 1000 } })
  await context.route('https://accounts.google.com/o/oauth2/v2/auth?**', async (route) => {
    const state = new URL(route.request().url()).searchParams.get('state')
    // A página Google simulada faz uma navegação entre origens, exercitando o cookie Lax.
    await route.fulfill({
      contentType: 'text/html',
      body:
        '<script>location.href=' +
        JSON.stringify(fixture.base + '/api/youtube/callback?state=' + state + '&code=fixture') +
        '</script>',
    })
  })
  await context.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.qrokePlaying=false;window.qrokePauses=0;
      window.YT={PlayerState:{ENDED:0},Player:class{
        constructor(node,options){this.events=options.events;this.frame=document.createElement('iframe');this.frame.title='Vídeo de teste';node.replaceWith(this.frame);window.qrokeFake=this;setTimeout(()=>this.events.onReady({target:this}),0)}
        getIframe(){return this.frame} getCurrentTime(){return 10} getDuration(){return 180}
        seekTo(){} playVideo(){window.qrokePlaying=true}
        pauseVideo(){window.qrokePlaying=false;window.qrokePauses++} destroy(){this.frame.remove()}
      }};window.onYouTubeIframeAPIReady?.()`,
    }),
  )
  await context.request.post(fixture.base + '/api/auth', { data: { action: 'login', pin: '4321' } })
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(fixture.base + '/host')
  await expect(page.locator('.youtube-playlists')).toBeVisible()
  await page
    .getByLabel('Link da playlist', { exact: true })
    .fill('https://youtube.com/playlist?list=PLabcdefghijk')
  await expect(page.getByRole('button', { name: 'Conferir', exact: true })).toBeEnabled()
  await page.getByLabel('Link da playlist', { exact: true }).press('Enter')
  await expect(page.locator('.playlist-tracks li')).toHaveCount(2)
  await expect(page.locator('.playlist-preview')).toContainText('1 indisponíveis')
  for (const width of [1366, 360, 320]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 1366, height: 1000 })
  await page.locator('.youtube-playlists').screenshot({ path: 'test-results/playlists-dark.png' })
  await page.getByRole('button', { name: 'Usar tema claro' }).click()
  await page.locator('.youtube-playlists').screenshot({ path: 'test-results/playlists-light.png' })
  await page.getByRole('button', { name: 'Tocar neste dispositivo', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar 2 músicas', exact: true }).click()
  await expect(page.locator('.playlist-success')).toContainText('2 música(s) adicionada(s)')
  await expect.poll(() => page.evaluate(() => window.qrokePlaying)).toBe(true)
  await page.evaluate(() => {
    window.originalPlayer = window.qrokeFake
    window.originalFrame = document.querySelector('iframe')
  })
  await page.getByRole('button', { name: 'Minha conta', exact: true }).click()
  await page.getByRole('button', { name: 'Conectar YouTube', exact: true }).click()
  await expect(page.getByText('Conta conectada neste navegador', { exact: true })).toBeVisible()
  await expect(page.locator('.account-playlists li')).toHaveCount(1)
  expect(page.url()).toBe(fixture.base + '/host')
  expect(
    await page.evaluate(
      () =>
        window.originalPlayer === window.qrokeFake &&
        window.originalFrame === document.querySelector('iframe') &&
        window.qrokePlaying,
    ),
  ).toBe(true)
  await page.locator('.account-playlists button').first().click()
  await expect(page.locator('.playlist-tracks li')).toHaveCount(2)
  await page.getByRole('button', { name: 'Adicionar 2 músicas', exact: true }).click()
  await expect(page.locator('.playlist-success')).toContainText('2 já estava(m)')
  await page.getByRole('button', { name: 'Desconectar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Conectar YouTube', exact: true })).toBeVisible()

  let invite = {
    url: 'http://192.168.1.10:3100/',
    status: 'ok',
    message: 'Servidor alcançável.',
    checkedAt: Date.now(),
  }
  await context.route('**/api/network/invite', (route) => route.fulfill({ json: invite }))
  await page.goto(fixture.base + '/qr')
  await expect(page.locator('.qr-plate')).toHaveAttribute('aria-label', 'QR para ' + invite.url)
  const first = await page.locator('.qr-plate').innerHTML()
  invite = {
    ...invite,
    url: 'http://192.168.1.20:3100/',
    status: 'updated',
    message: 'QR atualizado automaticamente.',
  }
  // Checagem automática acionada ao recuperar a rede; sem clique ou reload.
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.locator('.qr-plate')).toHaveAttribute('aria-label', 'QR para ' + invite.url)
  expect(await page.locator('.qr-plate').innerHTML()).not.toBe(first)
  invite = { ...invite, status: 'unreachable', message: 'O IP mudou; confira o encaminhamento.' }
  await page.getByRole('button', { name: 'Verificar acesso', exact: true }).click()
  await expect(page.locator('.qr-network')).toContainText('confira o encaminhamento')
  await expect(page.locator('.qr-plate')).toHaveCount(0)
  await expect(page.locator('.invite-link')).toHaveCount(0)
  invite = { ...invite, status: 'ok', message: 'Servidor alcançável.' }
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.locator('.qr-plate')).toBeVisible()
  await expect(page.locator('.invite-link')).toHaveAttribute('href', invite.url)
  expect(errors).toEqual([])
  console.log(
    'Playlists: Enter, prévia, importação, duplicatas, OAuth em popup sem recriar player, desconexão e layouts 320/360/1366 aprovados.',
  )
  console.log('QR: URL e imagem regeneradas ao recuperar rede; aviso de falha aprovado.')
} finally {
  await browser.close()
  await fixture.close()
}
