<script setup lang="ts">
const sections = [
  { id: 'servico', title: 'O serviço e estas condições' },
  { id: 'participacao', title: 'Participação e responsabilidades' },
  { id: 'youtube', title: 'YouTube, Google e conteúdo' },
  { id: 'uso-permitido', title: 'Regras de uso' },
  { id: 'disponibilidade', title: 'Disponibilidade e encerramento' },
  { id: 'privacidade', title: 'Privacidade, alterações e contato' },
]
</script>
<template>
  <LegalDocument
    title="Termos de Uso do QRokê"
    intro="As regras para organizar sua festa, compartilhar músicas e usar as integrações do QRokê com respeito às pessoas e aos criadores."
    :sections="sections"
  >
    <section id="servico">
      <h2>1. O serviço e estas condições</h2>
      <p>
        O QRokê organiza festas com fila compartilhada de músicas, pedidos, votos e karaokê pelo
        navegador. Estes termos se aplicam ao site qroke.com.br e ao aplicativo instalado a partir
        dele. Ao criar uma festa, participar ou conectar uma conta, você aceita estas condições e a
        <NuxtLink to="/politica-de-privacidade">Política de Privacidade</NuxtLink>.
      </p>
      <p>
        Use o serviço somente se puder aceitar estas condições. Menores de idade devem contar com a
        orientação de seu responsável e respeitar os requisitos de idade e autorização dos serviços
        de terceiros. O QRokê não é direcionado a crianças.
      </p>
    </section>
    <section id="participacao">
      <h2>2. Participação e responsabilidades</h2>
      <p>
        Para participar, você informa um nome ou apelido. Seu nome, pedidos e participações no
        karaokê podem aparecer aos demais participantes. Escolha o que deseja compartilhar e não use
        a identidade de outra pessoa.
      </p>
      <p>
        O anfitrião administra a fila, o aparelho de reprodução e o encerramento da festa. Guarde o
        PIN e compartilhe o convite apenas com quem pretende convidar. Quem recebe um convite pode
        encaminhá-lo. Os votos fazem parte da organização da fila e não garantem uma posição fixa
        nem a reprodução de uma música.
      </p>
    </section>
    <section id="youtube">
      <h2>3. YouTube, Google e conteúdo</h2>
      <p>
        O QRokê utiliza serviços de API do YouTube e seu player incorporado. Ao usar esses recursos,
        você também concorda em ficar vinculado aos
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer"
          >Termos de Serviço do YouTube</a
        >. O tratamento de dados pelo Google está descrito na
        <a
          href="https://policies.google.com/privacy?hl=pt-BR"
          target="_blank"
          rel="noopener noreferrer"
          >Política de Privacidade do Google</a
        >.
      </p>
      <p>
        A conexão com o Google é opcional e serve para ler suas playlists do YouTube. A integração
        solicita acesso de leitura; não publica vídeos nem altera suas playlists no YouTube. Ao
        adicionar uma música ou playlist à festa, os dados dos itens selecionados ficam visíveis na
        fila compartilhada. Você pode desconectar a conta e revogar a autorização, conforme as
        <NuxtLink to="/exclusao-de-dados">instruções de exclusão e desconexão</NuxtLink>.
      </p>
      <p>
        Vídeos, músicas, letras e marcas de terceiros pertencem aos respectivos titulares. Adicionar
        um item à fila não transfere direitos nem concede licença de execução pública ou exploração
        comercial. O organizador deve obter as autorizações aplicáveis ao seu evento. Não use o
        QRokê para baixar, extrair áudio, contornar restrições ou reproduzir conteúdo sem
        autorização.
      </p>
      <p>
        A disponibilidade, os anúncios e as restrições de cada vídeo dependem do YouTube, do
        conteúdo e do navegador. O QRokê não garante reprodução sem anúncios, mesmo para assinantes
        Premium, nem disponibilidade de uma faixa específica. Não somos afiliados, patrocinados ou
        aprovados pelo Google, YouTube ou redes sociais apenas por oferecer integrações ou
        compartilhamento.
      </p>
    </section>
    <section id="uso-permitido">
      <h2>4. Regras de uso</h2>
      <ul>
        <li>
          Respeite os participantes: não pratique assédio, discriminação, ameaças, fraude ou
          divulgação indevida de dados pessoais.
        </li>
        <li>
          Não tente acessar outra festa sem autorização, descobrir PINs, manipular votos de forma
          abusiva ou sobrecarregar o serviço.
        </li>
        <li>
          Não remova proteções ou sinais de autoria e não use o serviço para infringir direitos de
          terceiros.
        </li>
        <li>
          Use conteúdo, nomes e links que possa compartilhar. Avise o responsável pelo QRokê ao
          identificar abuso ou falha.
        </li>
      </ul>
    </section>
    <section id="disponibilidade">
      <h2>5. Disponibilidade e encerramento</h2>
      <p>
        Uma nova festa fica disponível por até 24 horas ou até o anfitrião encerrá-la. Interrupções
        de rede, manutenção, limites de APIs e incompatibilidades do navegador podem afetar o
        funcionamento. Teste o som e os aparelhos antes do evento.
      </p>
      <p>
        Podemos limitar o acesso diante de abuso, falha de segurança ou exigência legal. Os
        controles do anfitrião e o encerramento da festa não substituem um pedido de exclusão de
        dados. Nenhuma cláusula destes termos exclui direitos obrigatórios previstos na legislação
        brasileira, inclusive os direitos do consumidor quando aplicáveis.
      </p>
    </section>
    <section id="privacidade">
      <h2>6. Privacidade, alterações e contato</h2>
      <p>
        Consulte a <NuxtLink to="/politica-de-privacidade">Política de Privacidade</NuxtLink> para
        conhecer os dados utilizados, cookies e escolhas de medição. Pedidos de acesso, correção ou
        exclusão podem ser feitos pelo canal indicado nas
        <NuxtLink to="/exclusao-de-dados">instruções sobre seus dados</NuxtLink>.
      </p>
      <p>
        Estes termos podem ser atualizados para refletir mudanças no serviço ou na legislação. A
        data da versão aparece nesta página. Mudanças relevantes nas finalidades ou permissões de
        dados serão informadas antes de sua aplicação, com nova autorização quando necessária.
        Aplica-se a legislação brasileira, preservados os direitos e o foro assegurados por lei.
      </p>
      <LegalContact />
    </section>
  </LegalDocument>
</template>
