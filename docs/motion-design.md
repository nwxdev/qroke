# Animações e tema do QRokê

## Movimento e energia visual

A execução visual deve dar ao QRokê um clima de show: entradas com ritmo, transições suaves, brilho e respostas alegres em cada interação. Os efeitos são componentes reutilizáveis e recebem cores, duração, intensidade e curvas de movimento do tema que os envolve. Tema claro, escuro e futuras identidades usam os mesmos componentes.

### Prompt de implementação

Implemente uma camada de movimento alegre, divertida e cheia de energia para o QRokê, mantendo a identidade lima e laranja. Componentize entrada de conteúdo, transição de listas, brilho de palco, partículas locais e confirmação de ações. Use tokens semânticos herdados do tema; não fixe a paleta dentro dos efeitos. Ao adicionar música, faça o ícone saltar, libere pequenas notas e confirme o pedido; ao curtir, use um impulso ascendente; ao descurtir, um movimento descendente curto e bem-humorado; ao retirar a reação, recolha o efeito. Dê resposta ao toque, à busca, à abertura de painéis, à troca de tema, às playlists e aos controles da festa. Na preparação do karaokê, apresente luzes de palco e entrada dos participantes. As animações devem ser finitas, rápidas, sem bloquear novos comandos, QR, vídeo, legendas ou som. Celebre somente operações confirmadas; erros não recebem efeitos de sucesso. Respeite movimento reduzido e mantenha as interações animadas habilitadas por padrão. Preserve nomes acessíveis, foco, contraste, desempenho em celulares e o player persistente.

| Interação                    | Direção do movimento                    | Regra                                                   |
| ---------------------------- | --------------------------------------- | ------------------------------------------------------- |
| Entrar ou navegar            | Revelação progressiva e transição curta | Não remontar o player                                   |
| Buscar músicas               | Entrada em sequência dos resultados     | Sem repetição a cada atualização da festa               |
| Adicionar música ou playlist | Salto do ícone, notas e brilho          | Apenas após aceite; lote gera uma celebração            |
| Curtir                       | Pulso ascendente e pequenas faíscas     | Preserva o cálculo de votos e acompanha a nova posição  |
| Descurtir                    | Impulso descendente em coral            | Sem punição ou humilhação                               |
| Retirar reação               | Recolhimento breve                      | Não confundir com novo voto                             |
| Reordenar ou remover         | Deslocamento e saída coordenados        | Sem bloquear comandos                                   |
| Trocar tema                  | Ícone gira e cores acompanham o tema    | Sem clarão de tela inteira                              |
| Preparar karaokê             | Fachos de luz e entrada do título       | Efeitos atrás do conteúdo e fora do vídeo em reprodução |
| Movimento reduzido           | Estado estático e confirmação textual   | Mesmas funções e informação                             |

Implementado em 1º de outubro de 2026 nos fluxos existentes. A publicação é acompanhada na [issue #12](https://github.com/nwxdev/qroke/issues/12). XP, identidade permanente e as outras fases de gamificação mantêm os critérios de validação do plano. As animações não concedem pontos nem alteram as regras da fila.

## Componentes

- MotionReveal: entrada de conteúdo com atraso limitado e brilho opcional.
- MotionList: entrada, saída e reorganização de listas.
- MotionCue: reação junto ao controle, com sete partículas no máximo.
- MotionShowLights: luzes de palco durante a preparação do karaokê.
- MotionFeedback: uma confirmação por vez, com fechamento e anúncio acessível.
- useMotionPreference: animações ativas por padrão, inclusive ao atualizar preferências antigas; acompanha o movimento reduzido do aparelho. MotionToggle permanece como componente interno, sem botão nas telas.
- usePartyMotion: sinais de ações confirmadas, isolados por festa, sem reexecução por polling.

Os tokens em app/assets/motion.css recebem cores do tema existente. Um tema ancestral pode sobrescrever --motion-color, --motion-glow, --motion-shine, --motion-fast, --motion-enter, --motion-celebrate, --motion-show, --motion-distance, --motion-ease e --motion-spring. Componentes não escolhem uma marca própria.

## Ajustes da home — 2 de outubro de 2026

ActionButton mantém a área clicável estável e anima somente ícone/conteúdo e uma camada de brilho finita. O hover primário preserva preenchimento e contraste. Foi removida a segunda animação de escala do botão de adicionar música, que competia com MotionCue. A home posiciona CRIAR FESTA abaixo da entrada por QR Code e abre `/criar-festa`, onde o foco vai ao nome da festa; o formulário mantém envio e validação separados. PartySetupProgress acompanha nome, PIN de seis dígitos e confirmação, sem conceder pontos ou anunciar criação antes da resposta do servidor. Todas as cores vêm do tema, e as interações também ficam ativas por padrão na home.
