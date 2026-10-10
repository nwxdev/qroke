# Temas por festa

A identidade visual pertence à festa. O dono escolhe o tema na criação e pode alterá-lo em Festa → Aparência. DJs e convidados recebem a alteração automaticamente, mas não podem alterá-la. A preferência claro/escuro continua local a cada aparelho.

O tema Supervelocidade celebra o Dia das Crianças com azul, dourado, anéis e movimento inspirado no Sonic. Não utiliza imagens de personagens. A busca, os títulos das músicas e a fila mantêm a fonte de leitura padrão.

## Arquitetura

`shared/themes.ts` define os IDs permitidos e os metadados. A API valida os IDs e exige o dono da festa para alterações. O estado persiste no MongoDB e usa a sincronização existente de cada festa. Registros anteriores assumem o tema original.

`PartyThemeRuntime.vue` resolve o tema no servidor para a primeira renderização e acompanha o estado no cliente. A criação oferece uma prévia local. `themes.css` define tokens semânticos de cor, fontes, superfícies, player, bordas, raios e movimento. Os componentes Vue recebem propriedades reativas por `useThemeTokens`; `useTheme` sincroniza as cores Quasar com `setCssVar` e o modo escuro.

Esta abordagem usa as variáveis CSS em tempo de execução, evitando recompilar os valores Sass para cada tema. Referências: [cores do Quasar](https://quasar.dev/style/color-palette/), [modo escuro](https://quasar.dev/style/dark-mode/), [variáveis Sass](https://quasar.dev/style/sass-scss-variables/) e [CSS reativo em Vue](https://vuejs.org/api/sfc-css-features.html).

Os efeitos têm orçamento fixo: quatro anéis, seis linhas e um pulso por interação. O movimento do ponteiro é limitado por requestAnimationFrame e altera apenas propriedades CSS. Não há canvas ou intervalos contínuos em JavaScript. Efeitos param em abas ocultas, no modo cinema do karaokê e com a preferência de movimento reduzido. Decorações não interceptam cliques e não alteram as áreas de interação.

## Rádio e tela cheia

Novas festas começam com rádio ligado. Uma escolha salva de desligá-lo é preservada. `NUXT_RADIO_DEFAULT=false` permite configurar outra política de criação; os testes antigos usam essa configuração para manter filas determinísticas.

O botão de tela cheia fica junto ao controle claro/escuro. Usa a API de tela cheia do navegador e fica indisponível quando ela não é suportada. O controle de tela cheia específico do player continua disponível.

## Validação

Os testes verificam criação, primeira renderização, persistência, sincronização, rejeição de alterações por DJ, isolamento entre festas, cores Quasar, fonte da busca, contraste mínimo de 4,5:1 para texto principal/secundário e botões, movimento reduzido, tela cheia e larguras de 320 a 1440 pixels.
