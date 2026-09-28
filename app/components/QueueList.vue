<script setup lang="ts">
import type { QueueItem } from '../../shared/types'
const props = defineProps<{ manage?: boolean; compact?: boolean; items?: QueueItem[] }>()
const { queue, guest, pending, remove, reorder } = useParty()
const displayed = computed(() => props.items ?? queue.value)
const position = (item: QueueItem) =>
  queue.value.findIndex((track) => track.queueId === item.queueId)
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
  <PlaylistGroups v-if="!compact && !items" />
  <div v-if="!displayed.length" class="empty-queue">
    <span>♫</span>
    <h3>A próxima pode ser sua</h3>
    <p>Escolha uma música e dê o tom da festa.</p>
    <QueueSearchLink />
  </div>
  <TransitionGroup v-else name="queue" tag="ol" class="queue-list" :class="{ compact }">
    <li v-for="item in displayed" :key="item.queueId" class="queue-row">
      <span class="queue-number">{{ String(position(item) + 1).padStart(2, '0') }}</span>
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
        <PlaylistBadge :playlist="item.playlist" />
        <KaraokeSingers v-if="item.karaoke" :people="item.singers" :fallback="item.guestName" />
        <QueueVote v-if="!compact" :item="item" :index="position(item)" />
      </div>
      <small class="duration">{{ duration(item) }}</small>
      <div v-if="manage" class="row-actions">
        <button
          :disabled="pending || !canMove(position(item), -1)"
          :aria-label="'Mover ' + item.title + ' para cima'"
          @click="move(position(item), -1)"
        >
          ↑
        </button>
        <button
          :disabled="pending || !canMove(position(item), 1)"
          :aria-label="'Mover ' + item.title + ' para baixo'"
          @click="move(position(item), 1)"
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
