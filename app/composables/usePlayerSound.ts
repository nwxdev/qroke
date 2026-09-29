export function usePlayerSound() {
  const { isPlayer, device, soundDevice, connected } = useParty()
  const armed = computed(() => !!device.value && soundDevice.value === device.value.id)
  const soundStatus = computed(() => {
    if (!connected.value) return 'Aguardando conexão com a festa.'
    if (!armed.value) return 'Permita o áudio neste navegador.'
    return isPlayer.value
      ? 'Som ativado nesta tela.'
      : 'Som autorizado. Aguardando o anfitrião escolher este aparelho.'
  })
  const soundLabel = computed(() => {
    if (!connected.value) return 'Reconectando'
    if (!armed.value) return 'Ativar som'
    return isPlayer.value ? 'Som ativo' : 'Som autorizado'
  })
  const soundHint = computed(() => {
    if (!connected.value) return 'Aguarde a conexão'
    return armed.value && !isPlayer.value ? 'Aguardando seleção' : 'Nesta tela'
  })

  const active = computed(() => armed.value && isPlayer.value && connected.value)
  return { armed, active, connected, device, soundStatus, soundLabel, soundHint }
}
