<script setup lang="ts">
import type { QueueItem } from '../../shared/types'
const props = defineProps<{ manage?: boolean; compact?: boolean }>()
const { queue, guest, pending, remove, reorder } = useParty()
function move(index: number, delta: number) {
  const items = [...queue.value],
    target = index + delta
  if (target < 0 || target >= items.length) return
  const [item] = items.splice(index, 1)
  if (item) items.splice(target, 0, item)
  void reorder(items)
}
function canMove(index: number, delta: number) {
  const a = queue.value[index],
    b = queue.value[index + delta]
  return !!a && !!b && a.origin === b.origin
}
function duration(item: QueueItem) {
  return item.duration
    ? Math.floor(item.duration / 60) + ':' + String(item.duration % 60).padStart(2, '0')
    : '—'
}
</script>
<template>
  <div v-if="!queue.length" class="empty-queue">
    <span>♫</span>
    <h3>A próxima pode ser sua</h3>
    <p>Escolha uma música e dê o tom da festa.</p>
  </div>
  <TransitionGroup v-else name="queue" tag="ol" class="queue-list" :class="{ compact }">
    <li v-for="(item, index) in queue" :key="item.queueId" class="queue-row">
      <span class="queue-number">{{ String(index + 1).padStart(2, '0') }}</span>
      <img
        v-if="item.thumbnail"
        :src="item.thumbnail"
        alt=""
        loading="lazy"
        referrerpolicy="no-referrer"
      />
      <span v-else class="track-art">♫</span>
      <div class="track-info">
        <strong>{{ item.title }}</strong
        ><small
          >{{ item.guestName }} <span v-if="item.karaoke" class="tag">Karaokê</span
          ><span v-if="item.manualOrder !== null" class="tag">Manual</span></small
        >
      </div>
      <small class="duration">{{ duration(item) }}</small>
      <div v-if="manage" class="row-actions">
        <button
          :disabled="pending || !canMove(index, -1)"
          :aria-label="'Mover ' + item.title + ' para cima'"
          @click="move(index, -1)"
        >
          ↑
        </button>
        <button
          :disabled="pending || !canMove(index, 1)"
          :aria-label="'Mover ' + item.title + ' para baixo'"
          @click="move(index, 1)"
        >
          ↓
        </button>
      </div>
      <button
        v-if="manage || guest?.id === item.guestId"
        :disabled="pending || item.queueId === 'pending'"
        class="remove-button"
        :aria-label="'Remover ' + item.title"
        @click="remove(item.queueId)"
      >
        ×
      </button>
    </li>
  </TransitionGroup>
</template>
