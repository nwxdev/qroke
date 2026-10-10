# Temas por festa

A identidade visual pertence à festa. O dono escolhe o tema na criação e pode alterá-lo em Festa → Aparência. DJs e convidados recebem a alteração automaticamente, mas não podem alterá-la. A preferência claro/escuro continua local a cada aparelho.

O tema Sonic · Neon Festival combina a imagem do Sonic, cidade ilustrada, azul, dourado e argolas interativas nos modos claro e escuro. A marca QRokê fica preta no claro e branca no escuro quando um tema é aplicado; o visual original mantém suas cores. A busca, os títulos das músicas e a fila mantêm a fonte de leitura padrão.

## Arquitetura

`shared/themes.ts` define os IDs permitidos e os metadados. A API valida os IDs e exige o dono da festa para alterações. O estado persiste no MongoDB e usa a sincronização existente de cada festa. Registros anteriores assumem o tema original.

`PartyThemeRuntime.vue` resolve o tema no servidor para a primeira renderização e acompanha o estado no cliente. A criação oferece uma prévia local. `themes.css` define tokens semânticos de cor, fontes, superfícies, player, bordas, raios e movimento. Os componentes Vue recebem propriedades reativas por `useThemeTokens`; `useTheme` sincroniza as cores Quasar com `setCssVar` e o modo escuro.

Esta abordagem usa as variáveis CSS em tempo de execução, evitando recompilar os valores Sass para cada tema. Referências: [cores do Quasar](https://quasar.dev/style/color-palette/), [modo escuro](https://quasar.dev/style/dark-mode/), [variáveis Sass](https://quasar.dev/style/sass-scss-variables/) e [CSS reativo em Vue](https://vuejs.org/api/sfc-css-features.html).

As imagens WebP ficam em `public/themes/sonic`, com versões para celular e desktop: personagem de 33–97 KiB e cada cenário de 79–222 KiB. Só o cenário correspondente ao modo claro/escuro é exibido. A busca usa uma superfície sólida para preservar a leitura. O banner e o cenário são removidos do palco de karaokê.

Os efeitos de atmosfera têm orçamento fixo: quatro anéis, seis linhas e um pulso por interação. O movimento do ponteiro é limitado por requestAnimationFrame e altera apenas propriedades CSS. A argola do banner usa um único canvas WebGL carregado junto ao banner; redesenha somente durante interação, redimensionamento ou movimento. Suspende quando fora da tela ou em aba oculta, limita a resolução a 2×, libera buffers/listeners ao desmontar e oferece argola CSS caso WebGL esteja indisponível ou perca o contexto. Não adiciona dependências gráficas. Efeitos param em abas ocultas, no modo cinema do karaokê e com a preferência de movimento reduzido. Decorações não interceptam cliques e não alteram as áreas de interação.

## Curtidas, rádio e tela cheia

Curtidas e suas animações iniciam habilitadas. A preferência antiga `qroke:motion=off` é atualizada para `on` ao abrir a plataforma; movimento reduzido continua oferecendo confirmação textual sem animação. As regras de votos e rodízio da fila são preservadas.

Novas festas começam com rádio ligado. Uma escolha salva de desligá-lo é preservada. `NUXT_RADIO_DEFAULT=false` permite configurar outra política de criação; os testes antigos usam essa configuração para manter filas determinísticas.

O botão de tela cheia fica junto ao controle claro/escuro. Usa a API de tela cheia do navegador e fica indisponível quando ela não é suportada. O controle de tela cheia específico do player continua disponível.

## Validação

Os testes verificam criação, primeira renderização, persistência, sincronização, rejeição de alterações por DJ, isolamento entre festas, cores Quasar, fonte da busca, contraste mínimo de 4,5:1 para texto principal/secundário e botões, movimento reduzido, imagens responsivas, marca neutra, argola WebGL e fallback após perda de contexto, tela cheia e larguras de 320 a 1440 pixels.
