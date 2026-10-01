import { defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  setup(_options, nuxt) {
    nuxt.hook('modules:done', () => {
      nuxt.options.css = nuxt.options.css.map((entry) =>
        typeof entry === 'string' && /quasar\/dist\/quasar\.(css|sass)$/.test(entry)
          ? '~/assets/quasar.sass'
          : entry,
      )
    })
  },
})
