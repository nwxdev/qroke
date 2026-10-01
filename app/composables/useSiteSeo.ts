import {
  SITE_URL,
  SITE_DESCRIPTION,
  SITE_IMAGE,
  PUBLIC_PAGES,
  isProductionSite,
} from '#shared/site'
import { SITE_FAQ } from '#shared/site-content'
import { partyPage } from '#shared/parties'

export function useSiteSeo() {
  const route = useRoute()
  const config = useRuntimeConfig()
  const publicMeta = computed(() => PUBLIC_PAGES[route.path])
  const page = computed(() => partyPage(route.path))
  const indexable = computed(
    () => !!publicMeta.value && isProductionSite(String(config.public.partyUrl)),
  )
  const titles: Record<string, string> = {
    '/entrar': 'Você recebeu um convite para a festa | QRokê',
    '/busca': 'Buscar músicas e ver a fila | QRokê',
    '/host': 'Controles do anfitrião | QRokê',
    '/player': 'Player da festa | QRokê',
    '/qr': 'Convite da festa | QRokê',
    '/tv': 'Player da festa | QRokê',
    '/encerrada': 'Esta festa terminou | QRokê',
  }
  // Never publish query strings, invite tokens or personal party content in metadata.
  const canonical = computed(
    () => SITE_URL + (route.path === '/' ? '/' : route.path.replace(/\/$/, '')),
  )
  const title = computed(
    () => publicMeta.value?.title || titles[page.value] || 'Página não encontrada | QRokê',
  )
  const description = computed(
    () =>
      publicMeta.value?.description ||
      (page.value === '/entrar'
        ? 'Entre pelo convite, escolha músicas e cante com a galera. Abra o QRokê no navegador para participar da festa.'
        : SITE_DESCRIPTION),
  )
  useSeoMeta({
    title: () => title.value,
    description: () => description.value,
    robots: () =>
      indexable.value ? 'index, follow, max-image-preview:large' : 'noindex, nofollow',
    ogType: 'website',
    ogSiteName: 'QRokê',
    ogLocale: 'pt_BR',
    ogTitle: () => publicMeta.value?.title || 'Você está convidado para a festa no QRokê',
    ogDescription: () => description.value,
    ogUrl: () => canonical.value,
    ogImage: SITE_IMAGE,
    ogImageSecureUrl: SITE_IMAGE,
    ogImageType: 'image/jpeg',
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: 'Logo QRokê. Música e karaokê para sua festa. Entre pelo QR Code.',
    twitterCard: 'summary_large_image',
    twitterTitle: () => title.value,
    twitterDescription: () => description.value,
    twitterImage: SITE_IMAGE,
    twitterImageAlt: 'QRokê — Música e karaokê para sua festa',
  })
  useHead(() => ({
    link: [{ rel: 'canonical', href: canonical.value }],
    script: publicMeta.value
      ? [
          {
            key: 'site-schema',
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  '@id': SITE_URL + '/#website',
                  name: 'QRokê',
                  alternateName: 'QRoke',
                  url: SITE_URL + '/',
                  description: SITE_DESCRIPTION,
                  inLanguage: 'pt-BR',
                },
                {
                  '@type': 'WebApplication',
                  '@id': SITE_URL + '/#app',
                  name: 'QRokê',
                  url: SITE_URL + '/',
                  description: SITE_DESCRIPTION,
                  applicationCategory: 'MultimediaApplication',
                  operatingSystem: 'Web',
                  browserRequirements: 'Navegador com JavaScript e conexão à internet',
                  inLanguage: 'pt-BR',
                  image: SITE_IMAGE,
                  featureList: [
                    'Fila compartilhada de músicas',
                    'Convite por QR Code',
                    'Karaokê com amigos',
                    'Votos em músicas',
                  ],
                },
                {
                  '@type':
                    route.path === '/perguntas-frequentes'
                      ? 'FAQPage'
                      : route.path === '/mapa-do-site'
                        ? 'CollectionPage'
                        : 'WebPage',
                  '@id': canonical.value + '#page',
                  url: canonical.value,
                  name: title.value,
                  description: description.value,
                  dateModified: publicMeta.value.lastModified,
                  inLanguage: 'pt-BR',
                  isPartOf: { '@id': SITE_URL + '/#website' },
                  ...(route.path === '/mapa-do-site'
                    ? {
                        mainEntity: {
                          '@type': 'ItemList',
                          itemListElement: Object.entries(PUBLIC_PAGES)
                            .filter(([path]) => path !== '/mapa-do-site')
                            .map(([path, entry], index) => ({
                              '@type': 'ListItem',
                              position: index + 1,
                              name: entry.label,
                              url: SITE_URL + path,
                            })),
                        },
                      }
                    : {}),
                  ...(route.path === '/perguntas-frequentes'
                    ? {
                        mainEntity: SITE_FAQ.map(({ question, answer }) => ({
                          '@type': 'Question',
                          name: question,
                          acceptedAnswer: { '@type': 'Answer', text: answer },
                        })),
                      }
                    : {}),
                },
                ...(route.path === '/'
                  ? []
                  : [
                      {
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                          { '@type': 'ListItem', position: 1, name: 'QRokê', item: SITE_URL + '/' },
                          {
                            '@type': 'ListItem',
                            position: 2,
                            name: publicMeta.value.label,
                            item: canonical.value,
                          },
                        ],
                      },
                    ]),
              ],
            }).replace(/</g, '\\u003c'),
          },
        ]
      : [],
  }))
}
