<script setup lang="ts">
const { isPlayer } = useParty()
const supported = ref(false)
onMounted(() => {
  supported.value = 'documentPictureInPicture' in window
})
function openMini() {
  window.dispatchEvent(new Event('qroke:mini-player'))
}
</script>
<template>
  <details class="background-help">
    <summary>Usar outros apps sem parar a festa</summary>
    <p>
      <strong>YouTube:</strong> o vídeo precisa ficar visível. Trocar de aba, bloquear a tela ou
      abrir outro app no celular pausa a reprodução neste aparelho. Instalar o PWA não remove essa
      limitação.
    </p>
    <p v-if="supported">
      No computador, abra o <strong>Mini player</strong> e deixe a janela flutuante visível enquanto
      usa outras abas ou programas. Mantenha a aba original aberta. Ao abrir ou fechar a janela, o
      vídeo recarrega na posição atual.
    </p>
    <p v-else>
      O mini player flutuante não está disponível neste navegador. Um popup comum no celular pode
      virar outra aba e não garante reprodução ao sair do navegador.
    </p>
    <button v-if="supported && isPlayer" @click="openMini">Abrir mini player</button>
    <p>
      <strong>Para liberar seu celular:</strong> abra a festa em um computador, TV ou celular
      reserva. Ative o som nele e selecione-o em <strong>Anfitrião → Onde o som toca</strong>. Você
      continua escolhendo músicas e controlando a festa pelo seu celular.
    </p>
    <p>
      Enquanto toca, o QRokê tenta manter a tela ligada. Se aparecer “Tela pode apagar”, confira a
      economia de bateria. Isso não impede o bloqueio manual da tela.
    </p>
    <p>
      <strong>Biblioteca local:</strong> arquivos de áudio disponibilizados pelo anfitrião podem
      continuar em segundo plano. O sistema ainda pode interromper por falta de rede, economia de
      bateria ou encerramento do app. Esse recurso não transforma vídeos do YouTube em áudio.
    </p>
  </details>
</template>
<style scoped>
.background-help {
  padding: 12px 0;
  font-size: 13px;
}
summary {
  cursor: pointer;
  font-weight: 600;
}
p {
  margin-top: 12px;
}
button {
  margin-top: 12px;
}
</style>
