// Transporte apenas dos fixtures: o IP de documentação representa este servidor de teste.
const originalFetch = globalThis.fetch
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
  if (url.origin === process.env.NUXT_PUBLIC_PARTY_URL && url.pathname === '/api/network/probe') {
    return originalFetch('http://127.0.0.1:' + process.env.NITRO_PORT + url.pathname, init)
  }
  return originalFetch(input, init)
}
