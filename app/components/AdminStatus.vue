<script setup lang="ts">
const { role, managed } = useParty()
const { remainingLabel } = useAdminLease()
</script>
<template>
  <span class="tag active admin-status"
    ><AppIcon name="unlock" /><span>{{
      managed ? (role === 'owner' ? 'Dono da festa' : 'DJ') : 'Admin liberado'
    }}</span
    ><time v-if="!managed" :aria-label="'Controle disponível por ' + remainingLabel">{{
      remainingLabel
    }}</time></span
  >
</template>
