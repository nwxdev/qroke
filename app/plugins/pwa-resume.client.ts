export default defineNuxtPlugin(async () => {
  if (location.pathname !== '/' || !matchMedia('(display-mode: standalone)').matches) return
  let id = ''
  try {
    id = localStorage.getItem('qroke:last-party') || ''
  } catch {}
  if (!/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,63}$/.test(id)) return
  const result = await $fetch<{ authorized: boolean; role: string }>(
    '/api/f/' + id + '/access',
  ).catch(() => null)
  if (result?.authorized)
    await navigateTo('/f/' + id + (result.role === 'owner' ? '/host' : '/busca'), { replace: true })
})
