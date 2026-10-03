/// <reference types="youtube" />
export type YoutubeWindow = Window & { YT?: typeof YT; onYouTubeIframeAPIReady?: () => void }
const loading = new WeakMap<Window, Promise<void>>()
// The iframe posts events to its own window. A floating player needs that window's API.
export function loadYoutube(target: YoutubeWindow = window) {
  const pending = loading.get(target)
  if (pending) return pending
  const promise = new Promise<void>((resolve, reject) => {
    if (target.YT?.Player) {
      resolve()
      return
    }
    let timeout: ReturnType<typeof setTimeout>
    target.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout)
      resolve()
    }
    const script = target.document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    const failed = () => {
      clearTimeout(timeout)
      loading.delete(target)
      script.remove()
      reject(new Error('Não foi possível carregar o YouTube. Confira a internet.'))
    }
    script.onerror = failed
    timeout = setTimeout(failed, 15000)
    target.document.head.appendChild(script)
  })
  loading.set(target, promise)
  return promise
}
