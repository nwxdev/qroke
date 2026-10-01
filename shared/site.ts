export const SITE_URL = 'https://qroke.com.br'
export const SITE_TITLE = 'QRokê | Karaokê online e música para festas com QR Code'
export const SITE_DESCRIPTION =
  'Crie uma festa no QRokê, convide pelo QR Code e deixe a galera escolher músicas, votar na fila e cantar karaokê. Funciona no navegador do celular e da TV.'
export const SITE_IMAGE = SITE_URL + '/brand/qroke-share-v2.jpg'

export const PUBLIC_PAGES: Record<string, { title: string; description: string; label: string }> = {
  '/': { title: SITE_TITLE, description: SITE_DESCRIPTION, label: 'Início' },
  '/como-funciona': {
    title: 'Como funciona o QRokê: música para festas por QR Code',
    description:
      'Veja como criar uma festa, ativar o som, convidar pelo QR Code e organizar pedidos, votos e playlists em uma fila compartilhada.',
    label: 'Como funciona',
  },
  '/karaoke-online': {
    title: 'Karaokê online com amigos, fila e QR Code | QRokê',
    description:
      'Organize uma noite de karaokê no navegador. Escolha versões de karaokê, forme duplas, acompanhe a fila e prepare a TV para cantar com amigos.',
    label: 'Karaokê online',
  },
  '/perguntas-frequentes': {
    title: 'Dúvidas sobre QR Code, músicas e karaokê | QRokê',
    description:
      'Tire dúvidas sobre o QRokê: como entrar na festa, instalar o app, usar a TV, adicionar playlists, votar e administrar a fila de músicas.',
    label: 'Perguntas frequentes',
  },
}
export function isProductionSite(partyUrl: string) {
  try {
    return new URL(partyUrl).origin === SITE_URL
  } catch {
    return false
  }
}
