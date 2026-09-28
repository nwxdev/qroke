<script setup lang="ts">
import type { QueueItem } from '../../shared/types'
const props = defineProps<{ item: QueueItem; index: number }>()
const { guest, queue, pending, vote, votedQueueIds } = useParty()
const voted = computed(() => votedQueueIds.value.includes(props.item.queueId))
const reason = computed(() => {
  if (voted.value) return 'Retirar meu voto'
  if (!guest.value) return 'Entre pelo nome para votar'
  if (queue.value.some((item) => item.manualOrder !== null)) return 'Ordem definida pelo anfitrião'
  if (props.index === 0) return 'Já é a próxima música'
  return 'Votar para subir na fila'
})
const blocked = computed(
  () =>
    !voted.value &&
    (!guest.value || props.index === 0 || queue.value.some((item) => item.manualOrder !== null)),
)
</script>
<template>
  <button
    v-if="item.origin === 'human' && item.queueId !== 'pending'"
    class="queue-vote"
    :title="reason"
    :aria-label="reason + ': ' + item.title"
    :aria-pressed="voted"
    :disabled="pending || blocked"
    @click="vote(item.queueId, !voted)"
  >
    <AppIcon :name="voted ? 'check' : 'vote'" /><span>{{ item.votes || 0 }}</span
    ><span class="vote-label">{{ voted ? 'Votei' : index === 0 ? 'Próxima' : 'Votar' }}</span>
  </button>
</template>
<style scoped>
.queue-vote {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 9px;
  min-height: 36px;
  font-size: 11px;
  width: fit-content;
}
.queue-vote[aria-pressed='true'] {
  color: var(--text);
  border-color: var(--accent);
  background: var(--surface-2);
}
.queue-vote .app-icon {
  width: 15px;
  height: 15px;
}
.queue-vote[aria-pressed='true'] .app-icon {
  animation: voted 0.2s ease-out;
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
  .queue-vote .app-icon {
    animation: none;
  }
}
</style>
