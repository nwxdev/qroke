// Vinheta original sintetizada; não usa músicas ou áudio de vídeos do YouTube.
export function useTransitionMusic(active: Ref<boolean>, volume: Ref<number>) {
  let context: AudioContext | undefined, gain: GainNode | undefined
  let timer: ReturnType<typeof setInterval> | undefined,
    step = 0
  const voices = new Set<OscillatorNode>()
  const notes = [261.63, 329.63, 392, 440, 392, 329.63, 293.66, 392]
  function stop() {
    clearInterval(timer)
    timer = undefined
    for (const voice of voices) {
      try {
        voice.stop()
      } catch {}
    }
    voices.clear()
  }
  function level() {
    if (gain && context)
      gain.gain.setTargetAtTime(
        (Math.max(0, Math.min(100, volume.value)) / 100) * 0.09,
        context.currentTime,
        0.03,
      )
  }
  function note() {
    if (!context || !gain || !active.value) return
    const voice = context.createOscillator(),
      envelope = context.createGain(),
      now = context.currentTime
    voice.type = 'triangle'
    voice.frequency.value = notes[step++ % notes.length]!
    envelope.gain.setValueAtTime(0, now)
    envelope.gain.linearRampToValueAtTime(0.7, now + 0.025)
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.42)
    voice.connect(envelope)
    envelope.connect(gain)
    voices.add(voice)
    voice.onended = () => {
      voices.delete(voice)
      voice.disconnect()
      envelope.disconnect()
    }
    voice.start(now)
    voice.stop(now + 0.45)
  }
  async function unlock() {
    if (!import.meta.client || !window.AudioContext) return
    try {
      context ||= new AudioContext()
      if (!gain) {
        gain = context.createGain()
        gain.connect(context.destination)
      }
      level()
      if (context.state === 'suspended') await context.resume()
      if (active.value && !timer && context.state === 'running') {
        step = 0
        note()
        timer = setInterval(note, 500)
      }
    } catch {
      /* Navegadores sem Web Audio mantêm apenas a contagem visual. */
    }
  }
  watch(active, (value) => {
    if (value) void unlock()
    else stop()
  })
  watch(volume, level)
  onBeforeUnmount(() => {
    stop()
    void context?.close().catch(() => {})
  })
  return { unlock }
}
