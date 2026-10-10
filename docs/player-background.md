# Reprodução durante a festa

O QRokê usa o iframe oficial para YouTube e o elemento HTML `audio` para a biblioteca local. São caminhos com limitações diferentes.

| Cenário                                           | Comportamento                                                                                                                           |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| YouTube na aba visível, mesmo sem foco            | Continua. A perda de foco sozinha não pausa.                                                                                            |
| YouTube em aba oculta ou tela bloqueada           | Pausa neste aparelho; retorna ao tornar o player visível, sujeito à autorização de áudio do navegador.                                  |
| Mini player em navegador de computador compatível | Janela Document Picture-in-Picture visível acima dos outros programas. A aba original precisa continuar aberta.                         |
| Chrome de celular / PWA sem Document PiP          | O app explica a limitação. Popup comum e instalação não habilitam YouTube em segundo plano.                                             |
| Biblioteca local                                  | O áudio não é pausado por ocultar a página. Conexão, interrupções de áudio e suspensão pelo sistema ainda podem interromper a execução. |

## Usar o mini player

No aparelho que já é o PLAYER, clicar em **Mini player**. O botão só aparece quando o navegador oferece a API Document Picture-in-Picture. **Voltar à aba** ou fechar a janela restaura o player original. Não abre um segundo dispositivo nem duplica o som. O iframe precisa ser recriado ao mudar de documento; a música retoma da posição capturada, com uma breve recarga. Trocar de tela dentro do QRokê continua preservando a instância existente.

A janela usa `/player-frame`, uma página vazia da própria origem, para fornecer ao YouTube um Referer válido. O documento `about:blank` do PiP sozinho provoca erro 153. A página não recebe tokens, PINs ou estado da festa, não é indexável e só pode ser incorporada pela própria origem. A API oficial é carregada na janela que contém o iframe, para receber seus eventos corretamente.

O app consulta a visibilidade do documento que contém o player. Uma janela PiP oculta também pausa o vídeo. Fechar a janela com a aba original oculta não inicia áudio invisível. Não há extração de áudio, vídeo invisível nem artifício de áudio silencioso.

## Celular livre durante a festa

Para usar outros apps no celular com músicas do YouTube, deixar um computador, TV ou celular reserva reproduzindo: abrir a festa nele, ativar o som e selecioná-lo em **Anfitrião → Onde o som toca**. Os demais celulares continuam como controle e busca.

O PLAYER solicita Screen Wake Lock enquanto está autorizado, tem uma faixa e a festa não está pausada. Ao ocultar a página, pausar, transferir ou sair, a reserva é liberada; ao voltar a uma tela visível, é solicitada novamente. **Tela ligada** confirma a reserva; **Tela pode apagar** informa recusa/liberação pelo sistema. Não impede bloqueio manual nem obriga o navegador a continuar no fundo. A biblioteca local depende de arquivos provisionados pelo anfitrião no servidor; não importa músicas do YouTube e não substitui automaticamente o catálogo.

## Karaokê e rolagem

A preparação permanece fixa na tela. Durante a contagem, o iframe pausado não se sobrepõe ao contador quando o scroll ativa o player recolhido. O mesmo iframe volta a aparecer ao terminar o prazo, sem recriação por rolagem. Título e cantores têm altura limitada para manter o número visível. O fundo tem gradientes animados suaves; a pausa, a preferência do app e `prefers-reduced-motion` controlam a animação. O mini player também mostra a preparação dentro da janela.

## Verificação

- `scripts/browser-background-check.mjs`: janela PiP **nativa** no Chromium; provedor YouTube, visibilidade e permissões de tela simulados. Confere posição, fechamento com aba oculta, avanço, ausência de player duplicado, erros de permissão e fim de duas faixas de áudio **nativo** em segundo plano.
- `scripts/browser-karaoke-check.mjs`: contagem fixa após scroll, player sem sobreposição, fundo animado/movimento reduzido e início da música após contagem com a página rolada.
- `scripts/browser-continuity-check.mjs`: navegação sem recriação, menus, PWA e transferência de aparelho preservando posição.
- Smoke separado com a API **real** do YouTube confirmou carregamento e `onReady` no documento próprio dentro da janela PiP, sem erro 153. Isso não substitui uma festa longa ou teste físico de celular bloqueado, Bluetooth ou economia de bateria.

## Referências

- [Políticas do player incorporado do YouTube](https://developers.google.com/youtube/terms/developer-policies-guide)
- [Document Picture-in-Picture no Chrome](https://developer.chrome.com/docs/web-platform/document-picture-in-picture)
- [Screen Wake Lock](https://developer.chrome.com/docs/capabilities/web-apis/wake-lock)

## Layout, erros e identificação do YouTube

A tela do player cabe em `100dvh`, sem banner acima do vídeo. Em tablets na vertical, o vídeo fica acima da fila e do convite; em telas horizontais, eles ficam lado a lado. A busca é expansível e o botão de tela cheia fica junto aos controles do cabeçalho. No palco de karaokê, a frase “Escolha a próxima música” aparece discretamente acima do QR somente em fullscreen. As mesmas regras usam os tokens dos temas original e Sonic, claros e escuros.

O iframe recebe `referrerpolicy="strict-origin-when-cross-origin"` **antes** de definir/carregar sua URL. O `origin` da API também é informado. Isso envia apenas a origem ao YouTube desde o primeiro pedido, sem expor o caminho da festa ou seus tokens. As demais páginas continuam com `Referrer-Policy: no-referrer`. A identificação é exigida pela [documentação do YouTube](https://developers.google.com/youtube/terms/required-minimum-functionality#embedded-player-api-client-identity).

O código 152 não tem uma definição pública na [referência da API IFrame](https://developers.google.com/youtube/iframe_api_reference#onError). Ele recebe uma mensagem neutra e pausa preservando a fila. Não é classificado como bloqueio definitivo do vídeo. Fechar o aviso só o oculta neste navegador; o anfitrião/DJ mantém a ação “Tentar reprodução novamente” nos controles. Um erro novo volta a ser mostrado. Restrições do próprio vídeo, conta, região ou aparelho ainda dependem do YouTube.

## Instalação e abertura do PWA

A instalação fica no menu de todas as telas. `beforeinstallprompt` habilita o convite nativo; em navegadores sem essa API, o menu explica o caminho manual. Dentro do PWA, a interface informa que o aplicativo já está aberto. No navegador, `getInstalledRelatedApps` e o evento `appinstalled` permitem trocar a ação para “Abrir QRokê”; um sinal antigo em localStorage não é considerado prova de instalação.

O manifesto declara o próprio aplicativo e `launch_handler: navigate-existing`. O link de abertura preserva a rota da festa e permite a captura de navegação pelo navegador. Não existe uma API universal que force abrir o PWA, especialmente em Safari/iOS e navegadores internos de outros apps. Se a detecção ou a captura não estiver disponível, o usuário recebe instruções para abrir pelo ícone ou pelo comando do navegador. Referências: [detecção de aplicativos instalados](https://developer.chrome.com/docs/capabilities/get-installed-related-apps) e [captura de navegação](https://developer.chrome.com/docs/capabilities/pwa-navigation-management).

O teste `browser-responsive-pwa-check.mjs` cobre detecção suportada/indisponível, aplicativo já aberto, nomes longos, dimensões de 320–1440px nos quatro visuais, Referer do primeiro pedido ao embed e fechamento/recuperação do erro 152. Ele simula o provedor e os sinais de instalação; não equivale a validar a instalação em todos os aparelhos físicos. Um smoke adicional em Chromium 153, com a API real e o vídeo oficial `M7lc1UVf-VE`, confirmou reprodução, contagem, fullscreen, QR e retorno à fila em 1280 × 720. O vídeo específico de Shrek depende do link para uma reprodução exata do caso relatado.
