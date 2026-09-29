<script setup lang="ts">
const props = defineProps<{ tv?: boolean }>()
const open = defineModel<boolean>({ default: false })
const { admin, failure, adminDialogOpen } = useParty()
const dialog = ref<HTMLDialogElement | null>(null)
function close() {
  open.value = false
}
function trapTab(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !dialog.value) return
  const items = Array.from(
    dialog.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]),input:not([disabled]),a[href],[tabindex="0"]',
    ),
  ).filter((el) => el.tabIndex >= 0 && el.getClientRects().length)
  const first = items[0],
    last = items.at(-1),
    active = document.activeElement
  if (!first || !last) {
    event.preventDefault()
    return
  }
  if (
    !items.includes(active as HTMLElement) ||
    (event.shiftKey ? active === first : active === last)
  ) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  }
}
if (props.tv) useSpatialNav(dialog, close, () => {})
watch(
  open,
  async (value) => {
    adminDialogOpen.value = value
    if (value) {
      failure.value = ''
      await nextTick()
      if (open.value && dialog.value && !dialog.value.open) {
        dialog.value.showModal()
        dialog.value.querySelector<HTMLInputElement>('input')?.focus()
      }
    } else if (dialog.value?.open) dialog.value.close()
  },
  { flush: 'post', immediate: true },
)
watch(admin, (value) => {
  if (value) close()
})
onBeforeUnmount(() => {
  dialog.value?.close()
  adminDialogOpen.value = false
})
</script>
<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="admin-dialog"
      aria-label="Liberar controle da festa"
      @keydown="trapTab"
      @cancel.prevent="close"
      @click.self="close"
      @close="close"
    >
      <div class="admin-dialog-content">
        <button class="dialog-close" aria-label="Fechar PIN" @click="close">
          <AppIcon name="plus" />
        </button>
        <AdminUnlock v-if="open" :tv="tv" />
      </div>
    </dialog>
  </Teleport>
</template>
