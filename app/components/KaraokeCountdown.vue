<script setup lang="ts">
const { state } = useParty()
const route = useRoute()
const { waiting, remaining } = useKaraokeCountdown()
const titleWords = computed(() => state.value?.current?.title.split(/\s+/) || [])
</script>
<template>
  <Transition name="karaoke-stage">
    <section
      v-if="waiting && state?.current"
      class="karaoke-countdown"
      :class="{ 'countdown-fullscreen': route.path === '/player', 'is-paused': state.paused }"
      aria-label="Preparação do karaokê"
    >
      <div class="countdown-content">
        <span class="eyebrow">{{
          state.paused ? 'PREPARAÇÃO EM PAUSA' : 'A SEGUIR NO KARAOKÊ'
        }}</span>
        <div class="countdown-number" aria-hidden="true">
          <svg :key="remaining" class="countdown-digit" viewBox="0 0 400 280">
            <text x="200" y="220" text-anchor="middle">{{ remaining }}</text>
          </svg>
        </div>
        <p class="countdown-status" role="status">
          {{ state.karaokeStartsAt ? 'A música vai começar' : 'Aguardando o PLAYER ativar o som' }}
        </p>
        <h1 :key="state.current.queueId" class="countdown-song" :aria-label="state.current.title">
          <span
            v-for="(word, index) in titleWords"
            :key="index"
            aria-hidden="true"
            :style="{ '--word-delay': Math.min(index, 8) * 55 + 'ms' }"
            >{{ word }}{{ index < titleWords.length - 1 ? ' ' : '' }}</span
          >
        </h1>
        <div class="countdown-performers">
          <KaraokeSingers :people="state.current.singers" :fallback="state.current.guestName" />
        </div>
        <p class="countdown-cue">É a vez de vocês. Posicionem-se para cantar!</p>
      </div>
    </section>
  </Transition>
</template>
<style scoped>
.karaoke-countdown {
  position: relative;
  display: grid;
  place-items: center;
  text-align: center;
  padding: clamp(16px, 4vw, 40px);
  border: 1px solid var(--accent);
  border-radius: 24px;
  background: var(--surface);
  margin-bottom: 20px;
  overflow-wrap: anywhere;
}
.countdown-content {
  width: min(100%, 1080px);
  min-width: 0;
  display: grid;
  justify-items: center;
  gap: 12px;
}
.countdown-content > .eyebrow {
  justify-content: center;
}
.countdown-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 15;
  margin: 0;
  border: 0;
  border-radius: 0;
  padding: calc(var(--player-header-space, 98px) + 8px)
    calc(5vw + var(--karaoke-qr-width, 180px) + 24px) var(--player-footer-space, 24px) 5vw;
  overflow: auto;
  background:
    radial-gradient(
      ellipse at 18% 25%,
      color-mix(in srgb, var(--brand-lime) 13%, transparent),
      transparent 55%
    ),
    radial-gradient(
      ellipse at 82% 85%,
      color-mix(in srgb, var(--brand-orange) 8%, transparent),
      transparent 55%
    ),
    var(--bg);
}
.countdown-number {
  width: min(400px, 100%);
  height: clamp(110px, 27dvh, 290px);
  color: var(--accent);
}
.countdown-digit {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.countdown-digit text {
  font-family: Manrope, sans-serif;
  font-size: 250px;
  font-weight: 800;
  fill: var(--accent);
  stroke: var(--accent);
  stroke-width: 2;
  stroke-dasharray: 1000;
  stroke-dashoffset: 0;
  animation: countdown-write 720ms cubic-bezier(0.2, 0.65, 0.3, 1) both;
}
.countdown-song {
  font-size: clamp(26px, 4vw, 56px);
  line-height: 1.15;
  max-width: 100%;
  color: var(--text);
  text-wrap: balance;
}
.countdown-song > span {
  display: inline-block;
  white-space: pre-wrap;
  animation: word-reveal 500ms cubic-bezier(0.2, 0.65, 0.3, 1) both;
  animation-delay: var(--word-delay);
}
.countdown-performers {
  border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--line));
  border-radius: 18px;
  padding: 14px 20px;
  background: var(--surface);
  max-width: 100%;
}
.countdown-performers :deep(.karaoke-singers) {
  justify-content: center;
  color: var(--text);
  font-size: clamp(18px, 2.3vw, 32px);
  font-weight: 700;
  line-height: 1.35;
}
.countdown-performers :deep(.karaoke-singers strong) {
  display: block;
  color: var(--accent);
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.countdown-status,
.countdown-cue {
  font-size: clamp(12px, 1.25vw, 16px);
}
.karaoke-stage-enter-active {
  transition: opacity 220ms ease;
}
.karaoke-stage-leave-active {
  display: none;
  pointer-events: none;
}
.karaoke-stage-enter-from,
.karaoke-stage-leave-to {
  opacity: 0;
}
.is-paused .countdown-digit text {
  animation: none;
}
@keyframes countdown-write {
  0% {
    fill: transparent;
    stroke-dashoffset: 1000;
    opacity: 0.5;
  }
  65% {
    fill: transparent;
    opacity: 1;
  }
  100% {
    fill: var(--accent);
    stroke-dashoffset: 0;
  }
}
@keyframes word-reveal {
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}
@media (max-width: 760px) {
  .countdown-fullscreen {
    padding-left: 12px;
    padding-right: calc(var(--karaoke-qr-width, 84px) + 30px);
    align-items: start;
  }
  .countdown-content {
    gap: 10px;
  }
  .countdown-number {
    height: clamp(100px, 24dvh, 190px);
  }
  .countdown-song {
    font-size: clamp(22px, 5vw, 32px);
  }
  .countdown-performers {
    padding: 12px;
  }
  .countdown-performers :deep(.karaoke-singers) {
    font-size: 18px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .countdown-digit text,
  .countdown-song > span {
    animation: none;
  }
  .karaoke-stage-enter-active,
  .karaoke-stage-leave-active {
    transition: none;
  }
}
</style>
