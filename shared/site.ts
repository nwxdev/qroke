export const SITE_URL = 'https://qroke.com.br'
export const SITE_TITLE = 'QRokê | Karaokê online e música para festas com QR Code'
export const SITE_DESCRIPTION =
  'Crie uma festa no QRokê, convide pelo QR Code e deixe a galera escolher músicas, votar na fila e cantar karaokê. Funciona no navegador do celular e da TV.'
export const SITE_IMAGE = SITE_URL + '/brand/qroke-share-v2.jpg'

export interface PublicPage {
  title: string
  description: string
  label: string
  // Date of the last meaningful content, structured-data or navigation change.
  // Update with the page; never substitute a request, build or deployment timestamp.
  lastModified: string
}

export const PUBLIC_PAGES: Record<string, PublicPage> = {
  '/': {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    label: 'Início',
    lastModified: '2026-10-02',
  },
  '/como-funciona': {
    title: 'Como funciona o QRokê: música para festas por QR Code',
    description:
      'Veja como criar uma festa, ativar o som, convidar pelo QR Code e organizar pedidos, votos e playlists em uma fila compartilhada.',
    label: 'Como funciona',
    lastModified: '2026-10-02',
  },
  '/karaoke-online': {
    title: 'Karaokê online com amigos, fila e QR Code | QRokê',
    description:
      'Organize uma noite de karaokê no navegador. Escolha versões de karaokê, forme duplas, acompanhe a fila e prepare a TV para cantar com amigos.',
    label: 'Karaokê online',
    lastModified: '2026-10-02',
  },
  '/perguntas-frequentes': {
    title: 'Dúvidas sobre QR Code, músicas e karaokê | QRokê',
    description:
      'Tire dúvidas sobre o QRokê: como entrar na festa, instalar o app, usar a TV, adicionar playlists, votar e administrar a fila de músicas.',
    label: 'Perguntas frequentes',
    lastModified: '2026-10-02',
  },
  '/termos-de-uso': {
    title: 'Termos de Uso do QRokê | Regras do aplicativo',
    description:
      'Conheça os Termos de Uso do QRokê, as regras de participação nas festas, responsabilidades dos usuários e condições de uso das integrações com YouTube e Google.',
    label: 'Termos de Uso',
    lastModified: '2026-10-02',
  },
  '/politica-de-privacidade': {
    title: 'Política de Privacidade do QRokê | Seus dados e escolhas',
    description:
      'Entenda como o QRokê trata dados das festas, conexão com Google, playlists do YouTube e cookies, e saiba como controlar a medição ou exercer seus direitos.',
    label: 'Política de Privacidade',
    lastModified: '2026-10-02',
  },
  '/exclusao-de-dados': {
    title: 'Exclusão de dados do QRokê | Solicitações e desconexão',
    description:
      'Veja como solicitar acesso, correção ou exclusão dos dados mantidos pelo QRokê, desconectar sua conta Google e controlar os dados de medição e do navegador.',
    label: 'Exclusão de dados',
    lastModified: '2026-10-02',
  },
  '/mapa-do-site': {
    title: 'Mapa do site: guias e páginas do QRokê',
    description:
      'Encontre as páginas públicas do QRokê, com guias para criar sua festa, convidar por QR Code, organizar o karaokê e esclarecer dúvidas sobre o app.',
    label: 'Mapa do site',
    lastModified: '2026-10-02',
  },
}
export function isProductionSite(partyUrl: string) {
  try {
    return new URL(partyUrl).origin === SITE_URL
  } catch {
    return false
  }
}
