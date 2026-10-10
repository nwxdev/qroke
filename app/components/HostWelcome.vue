<script setup lang="ts">
const { id } = usePartyRoute()
const { admin, guest, sessionReady } = useParty()
const dialog = ref<HTMLDialogElement | null>(null)
const visible = computed(() => !!id.value && sessionReady.value && admin.value && !guest.value)
watch(
  visible,
  async (open) => {
    await nextTick()
    if (open && !dialog.value?.open) {
      dialog.value?.showModal()
      dialog.value?.querySelector('input')?.focus()
    } else if (!open) dialog.value?.close()
  },
  { immediate: true },
)
onBeforeUnmount(() => dialog.value?.close())
</script>
<template>
  <dialog ref="dialog" class="host-welcome" aria-label="Nome do anfitrião" @cancel.prevent>
    <GuestJoin v-if="visible" host />
  </dialog>
</template>
<style scoped>
.host-welcome {
  padding: 0;
  width: min(440px, calc(100vw - 24px));
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  color: var(--text);
  max-height: calc(100dvh - 32px);
  overflow: auto;
}
.host-welcome .panel {
  margin: 0;
  border: 0;
}
.host-welcome::backdrop {
  background: var(--overlay);
}
</style>
