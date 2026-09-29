export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server || to.path === '/' || to.path === '/entrar') return
  try {
    const access = await $fetch<{ authorized: boolean }>('/api/access')
    if (!access.authorized) return navigateTo('/entrar' + (import.meta.client ? location.hash : ''))
  } catch {
    return navigateTo('/entrar')
  }
})
