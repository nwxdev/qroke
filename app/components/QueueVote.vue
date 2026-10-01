<script setup lang="ts">
import type { QueueItem } from '../../shared/types'
const props = defineProps<{ item: QueueItem; index: number }>()
const { guest, queue, pending, vote, queueReactions } = useParty()
const { feedback } = usePartyMotion()
const reaction = computed(() => queueReactions.value[props.item.queueId] || 0)
const manual = computed(() => queue.value.some((item) => item.manualOrder !== null))
function reason(value: 1 | -1) {
  if (reaction.value === value) return value === 1 ? 'Retirar meu like' : 'Retirar meu dislike'
  if (!guest.value) return 'Entre pelo nome para votar'
  if (manual.value) return 'Ordem definida pelo anfitrião'
  if (value === 1 && props.index === 0) return 'Já é a próxima música'
  return value === 1 ? 'Like para subir na fila' : 'Dislike para descer na fila'
}
function blocked(value: 1 | -1) {
  return (
    reaction.value !== value && (!guest.value || manual.value || (value === 1 && props.index === 0))
  )
}
</script>
<template>
  <div
    v-if="item.origin === 'human' && item.queueId !== 'pending'"
    class="queue-reactions"
    role="group"
    :aria-label="'Votos em ' + item.title"
  >
    <button
      v-for="value in [1, -1] as const"
      :key="value"
      class="queue-vote"
      :class="{ dislike: value === -1 }"
      :title="reason(value)"
      :aria-label="reason(value) + ': ' + item.title"
      :aria-pressed="reaction === value"
      :disabled="pending || blocked(value)"
      @click="vote(item.queueId, reaction === value ? 0 : value)"
    >
      <MotionCue
        :trigger="
          feedback?.target === item.queueId &&
          (feedback.kind === 'undo' ||
            (value === 1 ? feedback.kind === 'like' : feedback.kind === 'dislike'))
            ? feedback.id
            : 0
        "
        :kind="feedback?.kind || 'success'"
      >
        <AppIcon :name="value === 1 ? 'like' : 'dislike'" /> </MotionCue
      ><span>{{
        value === 1 ? (item.likes ?? Math.max(0, item.votes || 0)) : item.dislikes || 0
      }}</span>
    </button>
    <small class="vote-score" :aria-label="'Saldo de votos: ' + (item.votes || 0)"
      >Saldo {{ item.votes || 0 }}</small
    >
  </div>
</template>
<style scoped>
.queue-reactions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.queue-vote {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  min-height: 44px;
  min-width: 44px;
  font-size: 12px;
  width: fit-content;
}
.queue-vote[aria-pressed='true'] {
  color: var(--text);
  border-color: var(--accent);
  background: var(--surface-2);
}
.queue-vote.dislike[aria-pressed='true'] {
  border-color: var(--coral);
}
.queue-vote :deep(.app-icon) {
  width: 18px;
  height: 18px;
}
.vote-score {
  font-size: 10px;
  color: var(--muted);
}
@keyframes voted {
  from {
    transform: scale(0.7);
  }
  to {
    transform: scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .queue-vote :deep(.app-icon) {
    animation: none;
  }
}
</style>
