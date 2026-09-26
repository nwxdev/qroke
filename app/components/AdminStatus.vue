<script setup lang="ts">
const { remainingLabel } = useAdminLease()
</script>
<template>
  <span class="tag active admin-status"
    ><AppIcon name="unlock" /><span>Admin liberado</span
    ><time :aria-label="'Controle disponível por ' + remainingLabel">{{
      remainingLabel
    }}</time></span
  >
</template>
