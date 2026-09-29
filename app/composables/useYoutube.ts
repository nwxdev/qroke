/// <reference types="youtube" />
let loading: Promise<void> | undefined
export function loadYoutube() {
  return (loading ||= new Promise<void>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve()
      return
    }
    const target = window as typeof window & { onYouTubeIframeAPIReady?: () => void }
    target.onYouTubeIframeAPIReady = () => resolve()
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => {
      loading = undefined
      script.remove()
      reject(new Error('Não foi possível carregar o YouTube. Confira a internet.'))
    }
    document.head.appendChild(script)
  }))
}
