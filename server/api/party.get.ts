import { partyTheme } from '../../shared/themes'
export default defineEventHandler(async (event) => ({
  party: {
    ...(await party(event).info()),
    theme: partyTheme((await party(event).details()).state.theme),
  },
  serverTime: Date.now(),
}))
