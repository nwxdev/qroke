export interface SiteGuide {
  eyebrow: string
  title: string
  intro: string
  sections: { title: string; text: string }[]
}
export const SITE_FAQ = [
  {
    question: 'O que é o QRokê?',
    answer:
      'O QRokê é um site e app de música e karaokê para festas. O anfitrião cria a festa e compartilha um convite por link ou QR Code. Os convidados escolhem músicas e participam de uma fila compartilhada pelo navegador.',
  },
  {
    question: 'Preciso instalar um aplicativo ou criar uma conta?',
    answer:
      'Você pode usar o QRokê no navegador. Para participar, abra o convite e informe seu nome. A instalação do app é opcional. A conexão com o Google é usada quando você escolhe acessar suas playlists do YouTube.',
  },
  {
    question: 'Como faço para entrar pelo QR Code?',
    answer:
      'Aponte a câmera do celular para o QR Code da festa e abra o link. Você também pode usar Entrar na festa no QRokê para colar um convite ou ler o QR Code. Peça um novo convite ao anfitrião se a festa já terminou.',
  },
  {
    question: 'Onde a música toca?',
    answer:
      'A reprodução fica no aparelho escolhido para o som da festa. Os demais celulares funcionam como controles de participação. O anfitrião pode escolher o aparelho e administrar reprodução, fila e volume.',
  },
  {
    question: 'Como funciona o karaokê online?',
    answer:
      'Na busca, ative Karaokê e escolha uma versão apropriada para cantar. Informe os participantes do pedido e acompanhe a preparação e a fila. As letras dependem do vídeo escolhido; o QRokê não gera letras nem avalia a voz.',
  },
  {
    question: 'Posso usar playlists do YouTube?',
    answer:
      'Você pode conferir uma playlist por link ou conectar sua conta Google para acessar suas listas, quando a integração estiver disponível. É possível adicionar uma faixa ou um lote. A disponibilidade de cada vídeo depende do YouTube.',
  },
  {
    question: 'Os votos mudam a ordem das músicas?',
    answer:
      'Likes e dislikes participam da organização da fila junto com as regras de rodízio. O anfitrião também pode reordenar pedidos. Por isso, a posição de uma música pode mudar durante a festa.',
  },
  {
    question: 'Por quanto tempo uma festa fica disponível?',
    answer:
      'Uma nova festa fica disponível por 24 horas ou até o anfitrião encerrá-la. Depois, você pode criar outra festa. Guarde o PIN criado para administrar a sua festa.',
  },
]
export const SITE_GUIDES: Record<string, SiteGuide> = {
  '/como-funciona': {
    eyebrow: 'TODO MUNDO PARTICIPA',
    title: 'Uma fila de músicas. A festa inteira no ritmo.',
    intro:
      'O QRokê reúne pedidos de música e karaokê em uma fila compartilhada. Você organiza a festa no navegador e convida os amigos pelo QR Code, sem passar o celular de mão em mão.',
    sections: [
      {
        title: '1. Crie sua festa',
        text: 'Escolha um nome e crie um PIN de seis dígitos para administrar os controles. A festa fica disponível por 24 horas ou até você encerrá-la.',
      },
      {
        title: '2. Escolha onde o som vai tocar',
        text: 'Abra os controles do anfitrião no aparelho conectado ao som e ative a reprodução. O áudio fica em um aparelho escolhido, enquanto os outros celulares participam da festa.',
      },
      {
        title: '3. Convide pelo QR Code ou pelo link',
        text: 'Mostre o QR Code na tela ou compartilhe o convite. Cada pessoa abre o link, informa o nome e pode buscar músicas. Guarde o acesso de administrador com você.',
      },
      {
        title: '4. Deixe a galera escolher a trilha',
        text: 'Os participantes fazem pedidos, curtem ou descurtem músicas e acompanham a fila. O anfitrião pode pausar, pular ou reordenar. A posição combina votos, rodízio e ajustes do anfitrião.',
      },
      {
        title: 'Da playlist à hora de cantar',
        text: 'Confira playlists do YouTube, adicione faixas e alterne entre música e karaokê. Na hora de cantar, escolha uma versão adequada e indique quem vai participar.',
      },
    ],
  },
  '/karaoke-online': {
    eyebrow: 'SOLTE A VOZ COM A GALERA',
    title: 'Karaokê online para cantar junto.',
    intro:
      'Prepare uma noite de karaokê com pedidos pelo celular e a reprodução na tela da festa. O QRokê organiza os participantes e a fila para todo mundo acompanhar a sua vez.',
    sections: [
      {
        title: 'Prepare o aparelho da festa',
        text: 'Use um navegador no computador ou em um aparelho compatível com a tela e o som disponíveis. Ative a reprodução antes de começar e confira o volume. A compatibilidade do navegador e dos vídeos pode variar entre TVs.',
      },
      {
        title: 'Encontre a versão para cantar',
        text: 'Ative a opção Karaokê na busca e procure uma versão da música feita para cantar. Confira o vídeo escolhido: as letras e o acompanhamento vêm do conteúdo, não de uma transcrição criada pelo QRokê.',
      },
      {
        title: 'Cante sozinho, em dupla ou com amigos',
        text: 'Escolha os participantes antes de adicionar o pedido. O QRokê apresenta os nomes e a preparação antes da apresentação. Não há análise da voz ou nota de desempenho.',
      },
      {
        title: 'Acompanhe a fila e mantenha o convite à vista',
        text: 'A tela da festa ajuda a acompanhar a música e os próximos pedidos. O QR Code permite que mais pessoas entrem pelo celular. Votos e controles do anfitrião podem alterar a ordem.',
      },
      {
        title: 'Faça uma checagem antes de reunir a galera',
        text: 'Teste a conexão, a saída de som, o volume e as músicas que pretende usar. Conteúdos do YouTube dependem da disponibilidade do vídeo e podem ter limitações de reprodução.',
      },
    ],
  },
}
