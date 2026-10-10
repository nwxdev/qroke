import { partyIdFromPath, partyPage } from '#shared/parties'
import { PUBLIC_PAGES } from '#shared/site'
export default defineNuxtRouteMiddleware(async (to) => {
  if (
    PUBLIC_PAGES[to.path] ||
    ['/criar-festa', '/vincular'].includes(to.path) ||
    !to.matched.length
  )
    return
  const id = partyIdFromPath(to.path),
    page = partyPage(to.path)
  if (['/entrar', '/encerrada'].includes(page) || to.path === '/tv') return
  const prefix = id ? '/f/' + id : ''
  try {
    const request = import.meta.server ? useRequestFetch() : $fetch
    const access = await request<{ authorized: boolean }>(
      (id ? '/api/f/' + id : '/api') + '/access',
    )
    if (!access.authorized) return navigateTo(prefix + '/entrar' + to.hash)
  } catch (error) {
    if (id && (error as { statusCode?: number }).statusCode === 410)
      return navigateTo(prefix + '/encerrada')
    return navigateTo(prefix + '/entrar' + to.hash)
  }
})
