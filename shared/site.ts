export const SITE_URL = 'https://qroke.com.br'
export const SITE_TITLE = 'QRokê — Música e karaokê para sua festa'
export const SITE_DESCRIPTION =
  'Transforme sua festa com o QRokê: entre pelo QR Code, escolha músicas, compartilhe playlists e cante karaokê com seus amigos. A festa é de todo mundo.'

export function isProductionSite(partyUrl: string) {
  try {
    return new URL(partyUrl).origin === SITE_URL
  } catch {
    return false
  }
}
