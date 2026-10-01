<script setup lang="ts">
const sections = [
  { id: 'dados', title: 'Dados e finalidades' },
  { id: 'google-youtube', title: 'Conexão com Google e YouTube' },
  { id: 'cookies', title: 'Cookies e medição opcional' },
  { id: 'compartilhamento', title: 'Compartilhamento e serviços externos' },
  { id: 'retencao', title: 'Armazenamento e prazos' },
  { id: 'direitos', title: 'Suas escolhas e direitos' },
  { id: 'alteracoes', title: 'Atualizações desta política' },
]
</script>
<template>
  <LegalDocument
    title="Política de Privacidade do QRokê"
    intro="Saiba quais dados ajudam a festa a funcionar, o que acontece ao conectar o Google e como controlar a medição ou pedir a exclusão dos seus dados."
    :sections="sections"
  >
    <section id="dados">
      <h2>1. Dados e finalidades</h2>
      <p>
        O responsável identificado acima atua como controlador dos dados tratados pelo QRokê. Usamos
        os dados necessários para oferecer os recursos que você solicita, manter a segurança e
        atender obrigações legais. A medição opcional e o acesso à sua conta Google dependem de
        escolhas específicas.
      </p>
      <ul>
        <li>
          <strong>Festa e participação:</strong> nome da festa, nome ou apelido, identificadores de
          sessão, pedidos, votos, participantes do karaokê e histórico de reprodução. Esses dados
          organizam o acesso, a fila, o rodízio e a continuidade da festa.
        </li>
        <li>
          <strong>Aparelhos e segurança:</strong> identificador do aparelho, nome atribuído,
          navegador, sistema, modelo quando disponível, endereço IP e registros técnicos de
          requisições e falhas. São usados para reconhecer sessões, escolher o reprodutor,
          diagnosticar problemas e limitar abusos. O QRokê não lê número de série nem contatos do
          aparelho.
        </li>
        <li>
          <strong>Busca e playlists:</strong> termos pesquisados, links e identificadores de músicas
          ou playlists são enviados aos serviços de catálogo para retornar os resultados pedidos.
          Títulos, artistas, duração, miniaturas e disponibilidade ajudam a montar a fila.
        </li>
        <li>
          <strong>Preferências:</strong> tema, animações, volume e escolha de medição podem ficar no
          armazenamento do navegador.
        </li>
        <li>
          <strong>Atendimento:</strong> quando você escreve para o contato informado, usamos seu
          e-mail, mensagem e os dados necessários para localizar e responder à solicitação.
        </li>
      </ul>
      <p>
        A câmera é opcional para ler QR Codes: as imagens são processadas no próprio aparelho e não
        são enviadas ao servidor pelo leitor do QRokê. Esse recurso não solicita áudio. O karaokê
        não grava sua voz nem atribui notas de desempenho.
      </p>
    </section>
    <section id="google-youtube">
      <h2>2. Conexão com Google e YouTube</h2>
      <p>
        O QRokê utiliza serviços de API do YouTube e o player incorporado. Você pode participar sem
        conectar uma conta Google. Ao escolher conectar, o Google apresenta a autorização para
        leitura dos dados do YouTube, usada para listar suas playlists e conferir os itens que
        deseja adicionar.
      </p>
      <p>
        Podemos acessar títulos, identificadores, canais, miniaturas e itens das playlists
        autorizadas. As credenciais de autorização ficam protegidas no servidor; sua senha Google é
        informada somente ao Google. O QRokê não solicita acesso ao Gmail, contatos ou arquivos do
        Drive e não usa essa permissão para publicar vídeos ou modificar suas playlists.
      </p>
      <p>
        A lista de playlists autorizadas fica vinculada à sua sessão. Ao adicionar itens à festa,
        seus títulos, artistas, miniaturas e identificação da playlist podem aparecer aos
        participantes. Faça essa escolha considerando a visibilidade da fila.
      </p>
      <p>
        Os dados obtidos pelas APIs do Google são usados para os recursos de playlists solicitados.
        Não são vendidos, usados para publicidade personalizada, análise de crédito ou treinamento
        de modelos de inteligência artificial. Seu uso e transferência seguem a
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
          >Política de Dados do Usuário dos Serviços de API do Google</a
        >, incluindo as restrições de uso limitado quando aplicáveis.
      </p>
      <p>
        Para interromper o acesso no QRokê, use
        <strong>Playlists do YouTube → Minha conta → Desconectar</strong>. Para revogar a
        autorização junto ao Google, use a
        <a
          href="https://security.google.com/settings/security/permissions"
          target="_blank"
          rel="noopener noreferrer"
          >página de permissões da sua Conta Google</a
        >. São ações diferentes: desconectar no QRokê não apaga sua conta Google nem as músicas já
        adicionadas à festa. Consulte as
        <NuxtLink to="/exclusao-de-dados">instruções de exclusão</NuxtLink>.
      </p>
      <p>
        Consulte também a
        <a
          href="https://policies.google.com/privacy?hl=pt-BR"
          target="_blank"
          rel="noopener noreferrer"
          >Política de Privacidade do Google</a
        >
        e os
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer"
          >Termos de Serviço do YouTube</a
        >.
      </p>
    </section>
    <section id="cookies">
      <h2>3. Cookies e medição opcional</h2>
      <p>
        <strong>Funcionamento:</strong> cookies e armazenamento local mantêm sua sessão, acesso às
        festas, preferências e identificação de aparelho. O cookie de identificação do navegador
        pode durar até 30 dias; os acessos a cada festa seguem a validade dela. Apagar esses dados
        pode exigir um novo convite ou PIN e remover preferências salvas.
      </p>
      <p>
        <strong>Google Analytics:</strong> somente após você escolher “Aceitar medição”, a tag pode
        medir visitas às páginas públicas. O Google recebe informações de navegação e do aparelho,
        como página visitada, origem do acesso e navegador, e usa cookies para reconhecer visitas. A
        medição do QRokê não acompanha as telas das festas nem envia nomes, buscas, PINs ou links de
        convite; os recursos de publicidade estão desativados.
      </p>
      <p>
        Os cookies de medição são configurados com duração de até 180 dias, renovável durante o uso.
        Você pode recusar sem perder os recursos da festa e mudar sua escolha em
        <strong>Preferências de medição</strong>, no rodapé. Recusar interrompe novos envios e
        remove os cookies de medição deste navegador; isso não elimina automaticamente dados já
        recebidos pelo Google. A retenção desses dados também depende da configuração da propriedade
        Analytics.
      </p>
      <p>
        O player, imagens e demais serviços do YouTube podem receber dados de conexão e usar cookies
        ou tecnologias semelhantes quando carregados. Essa comunicação é separada da escolha de
        medição do QRokê e segue as políticas do Google e as configurações do seu navegador.
      </p>
    </section>
    <section id="compartilhamento">
      <h2>4. Compartilhamento e serviços externos</h2>
      <p>
        Participantes e anfitrião veem as informações necessárias à festa, como nomes, fila e
        participações. Quem possui um convite pode acessar a festa conforme as permissões dele.
        Evite incluir informações sensíveis no nome, nos pedidos e nos links compartilhados.
      </p>
      <p>
        Fornecedores de hospedagem e infraestrutura processam dados para operar o serviço. Google e
        YouTube recebem os dados necessários às integrações e, quando autorizada, à medição. Esses
        fornecedores podem processar informações fora do Brasil, conforme suas políticas e as
        garantias aplicáveis. Dados também podem ser fornecidos quando necessário para cumprir uma
        obrigação legal ou ordem válida.
      </p>
      <p>
        O compartilhamento de convites em WhatsApp, Telegram, Instagram ou Messenger é iniciado por
        você. O aplicativo escolhido e seus destinatários recebem o link, e a plataforma pode
        consultar título, descrição e imagem para montar a prévia. Isso não conecta automaticamente
        uma conta dessas redes ao QRokê. Novas integrações que solicitem dados ou permissões terão
        suas finalidades informadas antes da ativação.
      </p>
    </section>
    <section id="retencao">
      <h2>5. Armazenamento e prazos</h2>
      <ul>
        <li>
          <strong>Festas criadas pelo site:</strong> expiram em até 24 horas ou são encerradas pelo
          anfitrião. A limpeza dos registros da festa e de seus participantes é programada para
          começar 24 horas após o encerramento ou a expiração, em ciclos automáticos. Em caso de
          indisponibilidade técnica, a rotina tenta novamente.
        </li>
        <li>
          <strong>Conexão Google:</strong> a sessão de autorização no QRokê expira em até 8 horas e
          suas credenciais locais são removidas ao desconectar. Prévias de playlists expiram em 5
          minutos. Os itens adicionados à fila seguem o ciclo da festa.
        </li>
        <li>
          <strong>Navegador:</strong> preferências sem prazo automático permanecem até você
          alterá-las ou limpar os dados do site. Cookies seguem os prazos descritos acima e as
          regras do navegador.
        </li>
      </ul>
      <p>
        Os prazos da festa não significam exclusão de dados mantidos pelo Google, pelas redes
        sociais ou de mensagens enviadas ao atendimento. Registros necessários a obrigações legais,
        segurança ou exercício de direitos podem ter retenção específica; você pode solicitar
        informações pelo contato desta página.
      </p>
      <p>
        O site usa HTTPS, controles de acesso por festa e proteção das credenciais armazenadas. O
        PIN não é guardado em texto aberto. Nenhuma medida elimina todos os riscos; avise o contato
        do QRokê se suspeitar de acesso indevido.
      </p>
    </section>
    <section id="direitos">
      <h2>6. Suas escolhas e direitos</h2>
      <p>
        Você pode solicitar confirmação e acesso aos seus dados, correção, informações sobre
        compartilhamento, revogação de consentimento e, quando aplicável, portabilidade, oposição,
        anonimização, bloqueio ou eliminação. Esses pedidos são gratuitos e avaliados conforme a Lei
        Geral de Proteção de Dados (LGPD).
      </p>
      <p>
        Siga a página de <NuxtLink to="/exclusao-de-dados">Exclusão de dados</NuxtLink> para falar
        com o responsável e localizar sua participação. Podemos pedir informações proporcionais para
        confirmar a titularidade, sem solicitar senha Google ou PIN da festa. Se uma obrigação legal
        impedir a exclusão imediata de algum registro, informaremos o motivo e o alcance da
        retenção.
      </p>
      <p>
        Você também pode procurar a
        <a href="https://www.gov.br/anpd/pt-br" target="_blank" rel="noopener noreferrer"
          >Autoridade Nacional de Proteção de Dados</a
        >
        e os órgãos de defesa de direitos competentes.
      </p>
      <LegalContact />
    </section>
    <section id="alteracoes">
      <h2>7. Atualizações desta política</h2>
      <p>
        A data desta página identifica a versão vigente. Mudanças relevantes nas finalidades, dados
        ou integrações serão informadas antes do novo tratamento, com nova autorização quando
        necessária. Continuar usando o site não substitui o consentimento específico para medição ou
        permissões de conta.
      </p>
    </section>
  </LegalDocument>
</template>
