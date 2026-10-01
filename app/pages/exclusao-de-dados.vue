<script setup lang="ts">
import { LEGAL_OPERATOR } from '#shared/legal'
const requestUrl =
  'mailto:' +
  LEGAL_OPERATOR.email +
  '?subject=' +
  encodeURIComponent('QRokê — solicitação sobre meus dados')
const sections = [
  { id: 'solicitar', title: 'Solicitar exclusão ou acesso' },
  { id: 'google', title: 'Desconectar e revogar o Google' },
  { id: 'navegador', title: 'Medição e dados do navegador' },
  { id: 'festa', title: 'Encerramento da festa e resultado do pedido' },
]
</script>
<template>
  <LegalDocument
    title="Exclusão de dados do QRokê"
    intro="Você pode solicitar acesso, correção ou exclusão dos dados mantidos pelo QRokê e controlar suas conexões e preferências de medição."
    :sections="sections"
  >
    <section id="solicitar">
      <h2>1. Solicitar exclusão ou acesso</h2>
      <ol>
        <li>
          Escreva para <a :href="requestUrl">{{ LEGAL_OPERATOR.email }}</a> com o assunto “QRokê —
          solicitação sobre meus dados”.
        </li>
        <li>
          Informe o que deseja: acesso, correção, exclusão ou esclarecimento. Para localizar uma
          festa, inclua o nome ou apelido usado, nome da festa e data aproximada da participação.
        </li>
        <li>
          Não envie senha Google, PIN de administrador, códigos de acesso ou o link completo de um
          convite. Caso seja necessário confirmar sua identidade, pediremos apenas as informações
          proporcionais à solicitação.
        </li>
      </ol>
      <p>
        O atendimento responde pelo mesmo canal, informa a localização dos registros e o resultado
        da solicitação. Pedidos relativos a dados obtidos do YouTube serão tratados tão logo
        possível e em até 7 dias corridos após a confirmação necessária para identificar os dados.
        Demais pedidos seguem os prazos legais aplicáveis. Se algum registro precisar ser mantido
        por obrigação legal, informaremos a justificativa.
      </p>
      <p>
        Este é um canal de solicitação por e-mail. Abrir esta página ou o aplicativo de e-mail não
        envia um pedido nem executa uma exclusão automática.
      </p>
    </section>
    <section id="google">
      <h2>2. Desconectar e revogar o Google</h2>
      <p>
        Na festa, abra <strong>Playlists do YouTube → Minha conta → Desconectar</strong>. Isso
        remove a conexão local usada pelo QRokê. Repita nos outros navegadores ou festas em que
        tiver conectado a conta.
      </p>
      <p>
        Para remover a autorização junto ao Google, abra as
        <a
          href="https://security.google.com/settings/security/permissions"
          target="_blank"
          rel="noopener noreferrer"
          >permissões da sua Conta Google</a
        >, selecione o QRokê e remova o acesso. Se também quiser apagar dados já importados para uma
        festa, solicite a exclusão pelo contato acima.
      </p>
      <p>
        Desconectar não remove automaticamente músicas que já estão na fila. Excluir dados no QRokê
        não apaga sua conta, playlists ou vídeos do YouTube. Para alterar ou excluir conteúdo no
        YouTube, use os controles da própria plataforma.
      </p>
    </section>
    <section id="navegador">
      <h2>3. Medição e dados do navegador</h2>
      <p>
        Abra <strong>Preferências de medição</strong> no rodapé e escolha “Recusar medição” para
        interromper novos envios ao Analytics e remover seus cookies de medição deste navegador.
        Dados já enviados precisam ser avaliados em um pedido específico.
      </p>
      <p>
        Nas configurações do navegador, você também pode limpar cookies e dados de qroke.com.br para
        remover preferências e identificadores locais. Isso pode encerrar seus acessos às festas;
        não substitui uma solicitação de exclusão dos registros do servidor.
      </p>
    </section>
    <section id="festa">
      <h2>4. Encerramento da festa e resultado do pedido</h2>
      <p>
        O anfitrião pode encerrar a festa nos seus controles. Festas criadas pelo site também
        expiram em até 24 horas. A limpeza é programada para começar 24 horas após o encerramento ou
        a expiração, com novas tentativas em caso de falha. Os detalhes de retenção estão na
        <NuxtLink to="/politica-de-privacidade#retencao">Política de Privacidade</NuxtLink>.
      </p>
      <p>
        O QRokê não possui cadastro próprio por e-mail ou senha nem conexão de conta com Facebook,
        Instagram, Telegram ou TikTok nesta versão. Compartilhar um convite nessas redes não cria
        essa conexão. Mensagens e cópias recebidas por outras pessoas devem ser administradas no
        aplicativo em que foram compartilhadas.
      </p>
      <LegalContact />
    </section>
  </LegalDocument>
</template>
