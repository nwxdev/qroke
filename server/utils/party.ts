import { PartyDatabase } from '../core/database'
let database: PartyDatabase | undefined
export function party() {
  return (database ||= new PartyDatabase(useRuntimeConfig().database))
}
export function publishWarning(warning: string | null) {
  if (party().state().catalogWarning !== warning)
    party().mutate((s) => {
      s.catalogWarning = warning
    })
}
