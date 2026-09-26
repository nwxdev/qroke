<script setup lang="ts">
defineProps<{ tv?: boolean }>()
const { state, device, control, pending, api, act, playHere } = useParty()
</script>
<template>
  <div class="host-controls">
    <div class="control-row">
      <button
        class="primary-button"
        :disabled="pending || !state?.current"
        @click="control({ action: 'pause', paused: !state?.paused })"
      >
        {{ state?.paused ? '▶ Continuar' : 'Ⅱ Pausar' }}
      </button>
      <button :disabled="pending || !state?.current" @click="control({ action: 'skip' })">
        Pular ⏭
      </button>
      <button :disabled="pending || !state?.current" @click="control({ action: 'skip' })">
        Remover atual
      </button>
    </div>
    <div class="control-row">
      <button
        :disabled="pending"
        :aria-pressed="state?.mode === 'video'"
        @click="control({ action: 'mode', mode: 'video' })"
      >
        Vídeo</button
      ><button
        :disabled="pending"
        :aria-pressed="state?.mode === 'music'"
        @click="control({ action: 'mode', mode: 'music' })"
      >
        Música</button
      ><button
        :disabled="pending"
        :aria-pressed="state?.autoContinue"
        @click="control({ action: 'auto', enabled: !state?.autoContinue })"
      >
        Rádio {{ state?.autoContinue ? 'ligado' : 'desligado' }}
      </button>
    </div>
    <div class="control-row">
      <button :disabled="pending || !device" @click="playHere">Tocar neste dispositivo</button
      ><button :disabled="pending" @click="control({ action: 'reset-order' })">
        Voltar ao rodízio</button
      ><button :disabled="pending" @click="act(() => api('/api/auth', { action: 'logout' }))">
        Sair do admin
      </button>
    </div>
  </div>
</template>
