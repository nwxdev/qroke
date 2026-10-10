import { describe, it, expect } from 'vitest'
import { initialState } from '../server/core/initial-state'
import { partyTheme, PARTY_THEMES } from '../shared/themes'
describe('Party appearance defaults', () => {
  it('starts the radio enabled and supports an explicit deployment override', () => {
    expect(initialState().autoContinue).toBe(true)
    expect(initialState(false).autoContinue).toBe(false)
    expect(initialState().theme).toBe('classic')
  })
  it('accepts registered themes and safely falls back for older or invalid data', () => {
    for (const theme of PARTY_THEMES) expect(partyTheme(theme.id)).toBe(theme.id)
    expect(partyTheme(undefined)).toBe('classic')
    expect(partyTheme('<style>')).toBe('classic')
  })
})
