# TV e usabilidade do karaokê

O catálogo continua no YouTube. A pesquisa de fornecedores está em [Música licenciada no Brasil](music-licensing-br.md).

## Conectar com quatro caracteres

1. No celular, abrir **Anfitrião → Onde o som toca → Gerar código para TV**.
2. Na TV, abrir **qroke.com.br/tv**. A página inicial e o diálogo de entrada também oferecem **Entrar com a TV / Código**.
3. Digitar o código de quatro caracteres. A TV recebe acesso de convidado somente àquela festa e passa a ser o PLAYER; o PIN de administração não é compartilhado.
4. Na TV, tocar em **Ativar som**. Esse gesto também solicita tela cheia quando o aparelho entrou pelo fluxo de TV.

O código tem cinco minutos de validade, uso único e letras/números sem I, O, 0 ou 1. Gerar outro invalida o anterior. Encerrar a festa ou trocar o convite impede o uso dos códigos pendentes. Tentativas são limitadas por IP. Dragonfly compartilha os códigos entre réplicas; a reserva/rotação é atômica e as chaves usam hash. O código é uma autorização temporária para conectar o aparelho e transferir a reprodução; não deve ser publicado abertamente.

## Busca e foco

Backspace e setas dentro de campos de texto pertencem ao teclado. A navegação por controle remoto só trata essas teclas fora dos campos editáveis. **Limpar busca** esvazia texto, resultados e erro; invalida respostas pendentes e mantém o foco no campo. O contorno de foco do QInput fica somente no componente, sem um segundo contorno no input interno.

## Palco do karaokê

Novas festas usam **10 segundos** de preparação; o anfitrião continua podendo ajustar de 0 a 30 segundos. Configurações já salvas são preservadas. O prazo começa quando o PLAYER está conectado, autorizado e com a mídia preparada. O vídeo fica pausado durante a contagem; o servidor rejeita avanço/progresso antes do prazo.

A contagem ocupa a janela, recebe foco e usa o relógio do servidor. O fundo tem gradientes e luzes em movimento; a preferência de movimento reduzido é respeitada. Sair do palco devolve a contagem à página e libera os controles. O vídeo começa depois do prazo, com o QR no canto inferior direito. A lateral reservada ao QR evita cobrir imagem, legendas e controles do YouTube.

A tela cheia solicitada é a do documento QRokê, que inclui vídeo e convite. A entrada automática depende da permissão do navegador; **Tela cheia** permite concedê-la por gesto. O botão de fullscreen do próprio YouTube não inclui elementos externos ao iframe. Na TV e no palco, o aviso de instalação PWA fica oculto.

## Validação em aparelho físico

Em 3 de outubro de 2026, o roteiro passou em um Fire TV Stick AFTSSS (Android 9), comprado em 2022, usando Silk 138.18.2 e viewport de 960 × 540. Foram verificados o teclado nativo e Backspace, conexão por código, seleção do PLAYER, foco na contagem de dez segundos, animação, tela cheia por gesto, vídeo real do YouTube após a contagem, QR sem sobreposição ao vídeo e saída de volta à fila. O teste usou uma festa local descartável, sem alterar a produção.

No Silk, `visibility: hidden` no iframe impedia o YouTube de concluir a preparação. O PLAYER agora permanece montado e pausado atrás da contagem opaca. Durante a preparação, a página não isola suas camadas: o contador deve ficar acima do PLAYER persistente, que vive fora dela. Este teste valida o fluxo de início e reprodução; não constitui uma sessão contínua de várias horas.

## Repetir os testes

- `node scripts/browser-search-check.mjs`: busca real do servidor, Backspace no player, cursor, foco único e limpeza.
- `node --test tests/tv-pairing-integration.mjs`: duas instâncias, rotação, consumo concorrente, expiração, limites, isolamento e revogação.
- `node scripts/browser-tv-check.mjs`: entrada por código, seleção da TV, contagem, foco, animação, fullscreen, reprodução e posição do QR com YouTube simulado.
- `node scripts/browser-karaoke-check.mjs`: tamanhos de tela, cantores, prioridade, contagem configurável e retorno à fila.

Para usar o Silk físico, habilitar ADB no aparelho e autorizar o computador. Instalar as ferramentas oficiais Android no computador, conectar com `adb connect IP_DA_TV:5555`, consultar o socket de DevTools e criar os encaminhamentos:

```bash
adb -s IP_DA_TV:5555 forward tcp:9333 localabstract:amazon_silk_devtools_remote
adb -s IP_DA_TV:5555 reverse tcp:3296 tcp:3296
QROKE_FIRETV_CDP=http://127.0.0.1:9333 \
QROKE_FIRETV_ADB=/caminho/para/adb \
QROKE_FIRETV_DEVICE=IP_DA_TV:5555 \
QROKE_TV_LIVE_YOUTUBE=1 node scripts/browser-tv-check.mjs
```

O aparelho deve estar acordado com o Silk aberto. O roteiro cria uma festa descartável local e restaura a URL anterior ao terminar. Não usa a base de produção. A opção de YouTube real reproduz o vídeo de demonstração da documentação oficial; os metadados de catálogo permanecem de teste. Sem essa opção, a mídia é simulada. Capturas e relatório ficam em `test-results/`.

Referências: [depuração remota do Silk](https://docs.aws.amazon.com/silk/latest/developerguide/remote-debugging.html), [ferramentas do Fire TV](https://developer.amazon.com/docs/fire-tv/developer-tools.html) e [vídeo de demonstração do YouTube](https://developers.google.com/youtube/iframe_api_reference).
