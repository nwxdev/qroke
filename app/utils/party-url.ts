// Um QR de localhost abre o próprio celular, não o servidor da festa.
export function partyUrl(configured: string, origin: string): string | null {
  try {
    const url = new URL(configured.trim() || origin)
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === 'localhost.localdomain' ||
      /^(127|0)\./.test(host) ||
      ['[::1]', '[::]'].includes(host) ||
      /^\[::ffff:(7f[0-9a-f]{2}:|0:)/.test(host)
    )
      return null
    return url.origin + '/'
  } catch {
    return null
  }
}
