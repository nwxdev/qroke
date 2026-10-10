export interface PartyInfo {
  theme?: import('./themes').PartyTheme
  id: string
  name: string
  createdAt: number | null
  expiresAt: number | null
  closedAt: number | null
  status: 'active' | 'closed' | 'expired'
}
export interface MyParty extends PartyInfo {
  role: 'owner' | 'guest'
}
export function partyIdFromPath(path: string) {
  return /^\/f\/([a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,63})(?:\/|$)/.exec(path)?.[1] || ''
}
export function partyPage(path: string) {
  return path.replace(/^\/f\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,63}(?=\/|$)/, '') || '/entrar'
}
