import search from '../../search.get'

// The static YouTube routes take precedence over the dynamic [provider] branch.
export default defineEventHandler((event) => {
  event.context.params = { ...event.context.params, provider: 'youtube' }
  return search(event)
})
