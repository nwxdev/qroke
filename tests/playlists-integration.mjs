import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { startFixture, client } from './helpers/server.mjs'
const fixture = await startFixture(3192, {
  NODE_OPTIONS: '--import=' + new URL('./helpers/youtube-fetch.mjs', import.meta.url).pathname,
  NUXT_YOUTUBE_API_KEY: 'fixture-key',
  NUXT_YOUTUBE_CLIENT_ID: 'fixture-client',
  NUXT_YOUTUBE_CLIENT_SECRET: 'fixture-secret',
  NUXT_YOUTUBE_REDIRECT_URI: 'http://127.0.0.1:3192/api/youtube/callback',
})
const db = new Database(join(fixture.dir, 'party.sqlite'))
try {
  await test('playlists: autenticação, OAuth, privacidade, importação e expiração', async () => {
    const admin = client(fixture.base),
      guest = client(fixture.base)
    for (const [path, body] of [
      ['/status'],
      ['/playlists'],
      ['/connect', {}],
      ['/disconnect', {}],
      ['/preview', { input: 'PLabcdefghijk' }],
      ['/import', { ticket: 'x'.repeat(43) }],
    ])
      assert.equal((await guest.request('/api/youtube' + path, body)).status, 401)
    assert.equal((await admin.request('/api/auth', { action: 'login', pin: '4321' })).status, 200)
    const connect = await admin.request('/api/youtube/connect', {})
    assert.equal(connect.status, 200)
    assert.ok(connect.headers.getSetCookie()[0].includes('HttpOnly'))
    assert.ok(connect.headers.getSetCookie()[0].includes('SameSite=Lax'))
    const url = new URL(connect.data.url),
      state = url.searchParams.get('state')
    const callback = '/api/youtube/callback?state=' + state + '&code=fixture'
    // Sem cookie admin na volta do Google: somente o cookie transitório Lax.
    const callbackResult = await admin.request(callback, undefined, 'GET', {
      cookie: connect.headers.getSetCookie()[0].split(';')[0],
    })
    assert.ok(
      callbackResult.headers
        .getSetCookie()
        .some(
          (c) =>
            c.startsWith('qroke_youtube=') &&
            c.includes('HttpOnly') &&
            c.includes('SameSite=Strict'),
        ),
    )
    assert.ok(
      callbackResult.headers.get('content-security-policy').includes("frame-ancestors 'none'"),
    )
    assert.equal(callbackResult.headers.get('referrer-policy'), 'no-referrer')
    assert.equal((await admin.request('/api/youtube/status')).data.connected, true)
    const personal = await admin.request('/api/youtube/playlists')
    assert.equal(personal.data.items[0].title, 'Playlist da festa')
    assert.ok(!JSON.stringify(personal.data).includes('private'))
    const invalid = await admin.request('/api/youtube/preview', {
      input: 'https://evil.test/?list=PLabcdefghijk',
    })
    assert.equal(invalid.status, 400)
    const preview = await admin.request('/api/youtube/preview', {
      input: 'PLabcdefghijk',
      personal: true,
    })
    assert.equal(preview.data.tracks.length, 2)
    assert.equal(preview.data.skipped, 1)
    const device = await admin.request('/api/device', { label: 'Host teste' })
    await admin.request('/api/control', { action: 'assign', deviceId: device.data.id })
    const imported = await admin.request('/api/youtube/import', { ticket: preview.data.ticket })
    assert.equal(imported.data.added, 2)
    const stateAfter = (await guest.request('/api/state')).data
    assert.equal(stateAfter.current.id, 'aaaaaaaaaaa')
    assert.equal(stateAfter.queue[0].id, 'bbbbbbbbbbb')
    assert.equal(
      (await admin.request('/api/youtube/import', { ticket: preview.data.ticket })).status,
      410,
    )
    const repeat = await admin.request('/api/youtube/preview', { input: 'PLabcdefghijk' })
    const dedupe = await admin.request('/api/youtube/import', { ticket: repeat.data.ticket })
    assert.equal(dedupe.data.added, 0)
    assert.equal(dedupe.data.duplicates, 2)
    const privatePreview = await admin.request('/api/youtube/preview', {
      input: 'PLabcdefghijk',
      personal: true,
    })
    assert.equal((await admin.request('/api/youtube/disconnect', {})).status, 200)
    assert.equal(
      (await admin.request('/api/youtube/import', { ticket: privatePreview.data.ticket })).status,
      410,
    )
    assert.equal((await admin.request('/api/youtube/status')).data.connected, false)
    // Reconfere a lease depois da leitura remota, antes de devolver dados privados.
    const connectAgain = await admin.request('/api/youtube/connect', {})
    await admin.request(
      '/api/youtube/callback?state=' +
        new URL(connectAgain.data.url).searchParams.get('state') +
        '&code=fixture',
    )
    const waiting = admin.request('/api/youtube/playlists?pageToken=slow')
    await new Promise((r) => setTimeout(r, 120))
    db.prepare('UPDATE admins SET expires_at=0').run()
    assert.equal((await waiting).status, 401)
    assert.equal(
      (await admin.request('/api/youtube/import', { ticket: repeat.data.ticket })).status,
      401,
    )
    await guest.request('/api/auth', { action: 'login', pin: '4321' })
    assert.equal((await guest.request('/api/youtube/status')).data.connected, false)
    assert.equal((await guest.request('/api/youtube/playlists')).status, 409)
    const guestFlow = await guest.request('/api/youtube/connect', {})
    db.prepare('UPDATE admins SET expires_at=0').run()
    await guest.request(
      '/api/youtube/callback?state=' +
        new URL(guestFlow.data.url).searchParams.get('state') +
        '&code=fixture',
    )
    assert.equal((await guest.request('/api/session')).data.admin, false)
    assert.equal((await guest.request('/api/youtube/status')).status, 401)
    assert.ok(!fixture.logs().includes('fixture-private-access'))
    assert.ok(!fixture.logs().includes('fixture-secret'))
  })
} finally {
  db.close()
  await fixture.close()
}
