<script setup lang="ts">
const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
const theme = useState<import('#shared/themes').PartyTheme>(
  'qroke:active-party-theme',
  () => 'classic',
)
const cinema = useState('qroke:karaoke-cinema', () => false)
const { page } = usePartyRoute()
const compact = computed(() => props.compact || page.value === '/host')
</script>
<template>
  <section
    v-if="theme === 'sonic-day' && !cinema"
    class="sonic-banner"
    :class="{ 'sonic-banner--compact': compact }"
    aria-label="Sonic · Neon Festival"
  >
    <div class="sonic-banner-copy">
      <span class="sonic-label">SONIC <i aria-hidden="true">✦</i> NEON FESTIVAL</span>
      <h2>Aqui todo<br /><em>mundo canta.</em></h2>
      <p>Música, amigos e grandes momentos.</p>
      <LazySonicRing />
    </div>
    <img
      class="sonic-character"
      src="/themes/sonic/sonic-960-v1.webp"
      srcset="/themes/sonic/sonic-480-v1.webp 480w, /themes/sonic/sonic-960-v1.webp 960w"
      sizes="(max-width: 600px) 220px, 560px"
      width="960"
      height="640"
      alt="Sonic saltando com uma argola dourada"
      decoding="async"
    />
    <span class="sonic-banner-trail" aria-hidden="true" />
  </section>
</template>
<style scoped>
.sonic-banner {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: 280px;
  margin: 22px 0 26px;
  border: 2px solid var(--accent);
  border-radius: 20px;
  background-color: var(--surface);
  background-image:
    linear-gradient(
      90deg,
      var(--surface) 0%,
      color-mix(in srgb, var(--surface) 96%, transparent) 35%,
      color-mix(in srgb, var(--surface) 30%, transparent) 100%
    ),
    var(--sonic-scenery);
  background-size: cover;
  background-position: center;
  box-shadow:
    var(--shadow),
    0 0 24px color-mix(in srgb, var(--accent) 10%, transparent);
}
.sonic-banner-copy {
  position: relative;
  z-index: 2;
  width: 54%;
  padding: 28px 34px 18px;
}
.sonic-label {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: var(--accent);
}
.sonic-label i {
  color: var(--highlight);
  font-style: normal;
}
.sonic-banner h2 {
  font-family: var(--font-heading);
  font-size: clamp(30px, 3.8vw, 54px);
  font-weight: 900;
  line-height: 1.02;
  letter-spacing: -0.045em;
  font-style: italic;
  text-transform: uppercase;
  margin: 15px 0 12px;
  color: var(--text);
}
.sonic-banner h2 em {
  color: var(--accent);
  font-style: italic;
}
.sonic-banner p {
  color: var(--muted);
  font-size: 12px;
  margin: 0 0 8px;
  line-height: 1.6;
}
.sonic-character {
  position: absolute;
  z-index: 1;
  right: 1%;
  top: 50%;
  transform: translateY(-50%);
  width: 50%;
  height: 108%;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 12px 12px #0003);
}
.sonic-banner-trail {
  position: absolute;
  z-index: 0;
  right: -20%;
  bottom: 22px;
  transform: rotate(-12deg);
  width: 85%;
  height: 8px;
  background: linear-gradient(90deg, transparent, var(--coral), var(--highlight), var(--accent));
  box-shadow: 0 0 25px var(--coral);
  pointer-events: none;
}
.sonic-banner--compact {
  min-height: 190px;
}
.sonic-banner--compact .sonic-banner-copy {
  padding: 20px 28px 12px;
}
.sonic-banner--compact h2 {
  font-size: 34px;
  margin: 10px 0 6px;
}
.sonic-banner--compact p {
  display: none;
}
.sonic-banner--compact .sonic-character {
  width: 46%;
  height: 120%;
}
@media (max-width: 600px) {
  .sonic-banner {
    min-height: 250px;
    margin: 16px 0 20px;
    border-radius: 16px;
  }
  .sonic-banner-copy {
    width: 68%;
    padding: 22px 16px 12px;
  }
  .sonic-label {
    font-size: 8px;
    gap: 6px;
    letter-spacing: 0.08em;
  }
  .sonic-banner h2 {
    font-size: 31px;
    max-width: 155px;
    margin: 16px 0 10px;
  }
  .sonic-banner p {
    font-size: 10px;
    max-width: 155px;
  }
  .sonic-character {
    right: -12%;
    top: 58%;
    width: 66%;
    height: 88%;
    z-index: 0;
  }
  .sonic-banner--compact {
    min-height: 210px;
  }
  .sonic-banner--compact .sonic-banner-copy {
    padding: 18px 16px 10px;
  }
  .sonic-banner--compact h2 {
    font-size: 28px;
    max-width: 145px;
  }
  .sonic-banner--compact .sonic-character {
    width: 65%;
    height: 95%;
    right: -12%;
  }
}
</style>
