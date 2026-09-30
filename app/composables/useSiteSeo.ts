import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION, isProductionSite } from '#shared/site'

export function useSiteSeo() {
  const route = useRoute()
  const config = useRuntimeConfig()
  const publicPage = computed(() => route.path === '/' || route.path === '/entrar')
  const indexable = computed(
    () => publicPage.value && isProductionSite(String(config.public.partyUrl)),
  )
  const titles: Record<string, string> = {
    '/busca': 'Buscar músicas e ver a fila | QRokê',
    '/host': 'Controles do anfitrião | QRokê',
    '/player': 'Player da festa | QRokê',
    '/qr': 'Convite da festa | QRokê',
    '/tv': 'Player da festa | QRokê',
  }
  const canonical = computed(
    () => SITE_URL + (publicPage.value || !titles[route.path] ? '/' : route.path),
  )

  useSeoMeta({
    title: () => titles[route.path] || SITE_TITLE,
    description: SITE_DESCRIPTION,
    robots: () =>
      indexable.value ? 'index, follow, max-image-preview:large' : 'noindex, nofollow',
    ogType: 'website',
    ogSiteName: 'QRokê',
    ogLocale: 'pt_BR',
    ogTitle: SITE_TITLE,
    ogDescription: SITE_DESCRIPTION,
    ogUrl: () => canonical.value,
    ogImage: SITE_URL + '/brand/social-card.png',
    ogImageType: 'image/png',
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: 'QRokê — Música, karaokê e uma fila compartilhada para sua festa',
    twitterCard: 'summary_large_image',
    twitterTitle: SITE_TITLE,
    twitterDescription: SITE_DESCRIPTION,
    twitterImage: SITE_URL + '/brand/social-card.png',
    twitterImageAlt: 'QRokê — A festa é de todo mundo',
  })
  useHead(() => ({
    link: [{ rel: 'canonical', href: canonical.value }],
    script: publicPage.value
      ? [
          {
            key: 'website-schema',
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              '@id': SITE_URL + '/#website',
              name: 'QRokê',
              alternateName: 'QRoke',
              url: SITE_URL + '/',
              description: SITE_DESCRIPTION,
              inLanguage: 'pt-BR',
            }),
          },
        ]
      : [],
  }))
}
