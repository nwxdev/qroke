import { partyIdFromPath } from '#shared/parties'
export default defineNuxtPlugin((nuxtApp) => {
  const request = $fetch.create({
    onRequest(context) {
      const id = partyIdFromPath(nuxtApp.$router.currentRoute.value.path)
      if (
        id &&
        typeof context.request === 'string' &&
        context.request.startsWith('/api/') &&
        !/^\/api\/(?:f\/|parties(?:[/?]|$)|health(?:[/?]|$)|youtube\/callback)/.test(
          context.request,
        )
      )
        context.request = '/api/f/' + encodeURIComponent(id) + context.request.slice(4)
    },
  })
  return { provide: { partyFetch: request } }
})
