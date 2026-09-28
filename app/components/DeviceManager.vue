<script setup lang="ts">
import type { Device } from '../../shared/types'
const { state, device, pending, control, playHere, admin } = useParty()
const devices = ref<Device[]>([])
const names = reactive<Record<string, string>>({})
const editing = ref(''),
  notice = ref('')
let timer: ReturnType<typeof setInterval>
let disposed = false
async function load() {
  if (!admin.value) return
  try {
    const result = await $fetch<{ devices: Device[] }>('/api/devices', { timeout: 4000 })
    if (!disposed) {
      devices.value = result.devices
      notice.value = ''
    }
  } catch {
    if (!disposed) notice.value = 'Não foi possível atualizar os aparelhos.'
  }
}
const online = (item: Device) => !!state.value?.devices.some((d) => d.id === item.id)
function edit(item: Device) {
  editing.value = item.id
  names[item.id] = item.label
}
async function rename(item: Device) {
  await control({ action: 'rename-device', deviceId: item.id, label: names[item.id] })
  editing.value = ''
  await load()
}
async function remove(item: Device) {
  await control({ action: 'remove-device', deviceId: item.id })
  await load()
}
onMounted(() => {
  void load()
  timer = setInterval(load, 5000)
})
onBeforeUnmount(() => {
  disposed = true
  clearInterval(timer)
})
</script>
<template>
  <section class="panel device-panel">
    <h2>Onde o som toca</h2>
    <p>Escolha um único aparelho para reproduzir. O volume acima controla esse PLAYER.</p>
    <details class="device-help">
      <summary>Adicionar aparelho / Bluetooth / PWA</summary>
      <p>
        Abra o endereço da festa no Chrome do outro aparelho e entre em <strong>Player</strong>. Ele
        aparecerá aqui; selecione-o e toque em <strong>Ativar som</strong> na tela dele.
      </p>
      <NuxtLink to="/player">Abrir player e QR ↗</NuxtLink>
      <p>
        Para uma caixa Bluetooth, faça o pareamento nas configurações do aparelho que reproduz. O
        YouTube usa a saída de áudio desse sistema. O aplicativo não pareia caixas Bluetooth
        remotamente.
      </p>
      <p>
        Uma PWA segue as permissões do navegador e precisa manter o player visível para o YouTube. A
        instalação como aplicativo ainda não está disponível. Use o Chrome por enquanto.
      </p>
    </details>
    <p v-if="notice" class="hint">{{ notice }}</p>
    <div v-for="item in devices" :key="item.id" class="managed-device">
      <div class="managed-device-title">
        <strong>{{ item.label }}</strong
        ><span class="tag">{{ online(item) ? 'Online' : 'Offline' }}</span
        ><span v-if="state?.playerId === item.id" class="tag">PLAYER</span
        ><small v-if="item.id === device?.id">este aparelho</small>
      </div>
      <form v-if="editing === item.id" @submit.prevent="rename(item)">
        <input
          v-model="names[item.id]"
          :aria-label="'Nome do aparelho ' + item.label"
          maxlength="60"
          required
          :disabled="pending"
        />
        <button type="submit" :disabled="pending || !names[item.id]?.trim()">
          Salvar aparelho
        </button>
        <button type="button" @click="editing = ''">Cancelar</button>
      </form>
      <div v-else class="device-actions">
        <button
          :disabled="pending || !online(item) || state?.playerId === item.id"
          @click="
            item.id === device?.id ? playHere() : control({ action: 'assign', deviceId: item.id })
          "
        >
          {{ state?.playerId === item.id ? '● PLAYER' : 'Usar como PLAYER' }}
        </button>
        <button :disabled="pending" @click="edit(item)">Renomear</button>
        <button
          :disabled="pending"
          :aria-label="'Remover aparelho ' + item.label"
          @click="remove(item)"
        >
          {{ state?.playerId === item.id ? 'Desconectar PLAYER' : 'Remover' }}
        </button>
      </div>
    </div>
    <p
      v-if="state?.playerId && !state?.devices.some((d) => d.id === state?.playerId)"
      class="notice"
    >
      O PLAYER está desconectado. Escolha outro dispositivo.
    </p>
    <small
      >Remover revoga o acesso deste aparelho e interrompe seu som se ele for o PLAYER. Reabrir a
      página faz um novo registro. Trocas aguardam até 9 segundos para evitar som duplicado.</small
    >
  </section>
</template>
<style scoped>
.device-help {
  padding: 12px 0;
}
.device-help summary {
  cursor: pointer;
  color: var(--text);
}
.device-help p {
  font-size: 12px;
}
.managed-device {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}
.managed-device-title,
.device-actions,
.managed-device form {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.managed-device-title {
  margin-bottom: 10px;
}
.managed-device-title strong {
  overflow-wrap: anywhere;
}
.device-actions button {
  font-size: 12px;
}
.managed-device form input {
  min-width: 0;
  width: 100%;
}
.device-panel > small {
  display: block;
  margin-top: 12px;
}
</style>
