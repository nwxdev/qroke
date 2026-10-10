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
  const sessions = new BrowserSessions(database.db, config.encryptionKey)
  const member = await sessions.get(browser, database.scope)
  if (!member) return
  const principal = await sessions.principal(member)
  if (!principal) return
  if (principal.role === 'guest') {
    const invite = await database.inviteVersion()
    if (!invite || invite.version !== principal.version || invite.expiresAt <= Date.now()) return
  }
  return { database, member }
}
