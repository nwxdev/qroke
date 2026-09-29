import { BrowserSessions } from '../core/browser-sessions'
export async function authenticateBrowserParty(browser: string | undefined, partyId: string) {
  if (
    !browser ||
    !/^[a-zA-Z0-9_-]{43}$/.test(browser) ||
    !/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,63}$/.test(partyId)
  )
    return
  const config = useRuntimeConfig(),
    database = await openParty(config.organizationId, partyId)
  await database.assertActive()
  const member = await new BrowserSessions(database.db, config.encryptionKey).get(
    browser,
    database.scope,
  )
  if (!member) return
  if (member.role === 'guest') {
    const invite = await database.inviteVersion()
    if (!invite || invite.version !== member.version || invite.expiresAt <= Date.now()) return
  }
  return { database, member }
}
