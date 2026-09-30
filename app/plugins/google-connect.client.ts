import { partyIdFromPath } from '#shared/parties'
export default defineNuxtPlugin(() => {
  const version = useState('qroke:google-version', () => 0)
  const failure = useState('qroke:google-failure', () => '')
  let popup: Window | null = null
  let activeScope = ''
  function complete() {
    popup = null
    version.value++
  }
  window.addEventListener('message', (event) => {
    if (
      event.origin !== location.origin ||
      event.source !== popup ||
      event.data?.type !== 'qroke-youtube'
    )
      return
    if (event.data.result === 'connected') complete()
    else {
      popup = null
      failure.value =
        event.data.result === 'cancelled'
          ? 'Conexão cancelada.'
          : 'Não foi possível conectar o Google. Tente novamente.'
    }
  })
  window.addEventListener('focus', async () => {
    if (!popup) return
    try {
      const status = await $fetch<{ connected: boolean }>(activeScope + '/media/youtube/status')
      if (status.connected) complete()
    } catch {}
  })
  async function connect(before?: () => Promise<boolean>) {
    failure.value = ''
    const scope = partyIdFromPath(location.pathname)
    activeScope = scope ? '/api/f/' + scope : '/api'
    popup = window.open('about:blank', 'qroke-youtube-auth', 'popup,width=520,height=720')
    if (!popup) {
      failure.value = 'Permita a janela de login do Google neste navegador.'
      return
    }
    const target = popup
    try {
      if (before && !(await before())) {
        target.close()
        return
      }
      const result = await $fetch<{ url: string }>(activeScope + '/media/youtube/connect', {
        method: 'POST',
        body: {},
      })
      if (!target.closed) target.location.href = result.url
    } catch (error) {
      target.close()
      failure.value = errorText(error)
    }
  }
  return { provide: { connectGoogle: connect } }
})
