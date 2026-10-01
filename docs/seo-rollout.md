O QRokê precisa publicar as melhorias de SEO e concluir a configuração das plataformas para acompanhar a descoberta e o uso do produto. Esta issue é o roteiro operacional: preparar o site, verificar o domínio, enviar o sitemap, integrar GA4 e validar as prévias sociais.

**Implementação:** animações, páginas públicas com HTML no servidor, metadados, sitemap e cartão social publicados. O sitemap inclui as quatro páginas de conteúdo e o mapa navegável em /mapa-do-site. O estado da publicação e das verificações externas é acompanhado na [issue #12](https://github.com/nwxdev/qroke/issues/12). Em 1º de outubro de 2026, o responsável informou que o site já foi verificado no Google Search Console. A integração de Analytics usa o fluxo informado G-ZMWF4HFBV4, com preferência de medição e page_view das páginas públicas. Publicação e recebimento na conta são acompanhados na issue.

## 1. Publicar a base técnica

- [ ] Revisar e publicar a versão que inclui `shared/site.ts`, `shared/site-content.ts`, `useSiteSeo`, as páginas públicas e `public/brand/qroke-share-v2.jpg`.
- [ ] Em produção, manter `QROKE_ACCESS_REQUIRED=true` e a URL pública `https://qroke.com.br`. Em execução Nuxt compilada, conferir `NUXT_PUBLIC_PARTY_URL=https://qroke.com.br`; se o inicializador preencher valores a partir de `QROKE_PUBLIC_URL`, validar o valor efetivo. Nunca usar o domínio de produção como configuração de uma instalação de teste.
- [ ] Configurar no proxy redirecionamento permanente de HTTP e www para `https://qroke.com.br`, preservando caminho e parâmetros necessários. Conferir certificado TLS e ausência de desafios de login/CAPTCHA nas páginas públicas e na imagem.
- [ ] Validar retorno 200 para `/`, `/como-funciona`, `/karaoke-online`, `/perguntas-frequentes` e `/mapa-do-site`; 404 para URL inexistente.
- [ ] Conferir que `/robots.txt` permite as páginas públicas e aponta para `https://qroke.com.br/sitemap.xml`. O sitemap deve listar somente as páginas públicas canônicas cadastradas em shared/site.ts, incluindo /mapa-do-site. Cada entrada tem lastmod com a data da última alteração relevante de conteúdo.
- [ ] Manter `/entrar`, `/f/**`, busca, player, QR, administração e APIs fora da indexação. Convites continuam protegidos por acesso; seus metadados não incluem nomes, PINs ou tokens.
- [ ] Conferir o HTML sem JavaScript: título, descrição, canonical sem query/hash, Open Graph e JSON-LD. Validar também em PageSpeed Insights e no Rich Results Test. FAQ visível e schema coerente não garantem um resultado enriquecido.

## 2. Google Search Console: verificar e enviar

1. [ ] Entrar em [Google Search Console](https://search.google.com/search-console) com a conta responsável pelo produto.
2. [ ] Adicionar propriedade do tipo **Domínio**: `qroke.com.br`, sem protocolo ou caminho.
3. [ ] Copiar o registro TXT fornecido pelo Google e adicioná-lo ao DNS do domínio. Não inventar o valor nem remover registros existentes. Voltar ao Search Console e verificar após propagação; manter o registro.
4. [ ] Em **Sitemaps**, enviar `https://qroke.com.br/sitemap.xml` e confirmar a leitura.
5. [ ] Em **Inspeção de URL**, testar ao vivo as cinco páginas públicas. Conferir o canonical reconhecido, possibilidade de indexação e HTML; solicitar indexação das páginas novas.
6. [ ] Conferir relatórios de indexação, HTTPS, segurança e ações manuais. Registrar os motivos de exclusões inesperadas.
7. [ ] Após haver dados, acompanhar impressões, cliques, CTR, posição e páginas de entrada. Não solicitar indexação de convites ou repetir pedidos diariamente.

Referências: [propriedade de domínio](https://support.google.com/webmasters/answer/34592?hl=pt-br), [verificação por DNS](https://support.google.com/webmasters/answer/9008080?hl=pt-br), [sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [solicitar rastreamento](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

## 3. Google Analytics 4: criar e integrar

1. [ ] Em [Google Analytics](https://analytics.google.com), criar ou selecionar a conta do QRokê; criar uma propriedade GA4 com fuso de São Paulo e moeda BRL. O responsável pela conta deve revisar os termos e o compartilhamento de dados.
2. [ ] Criar um fluxo **Web** para `https://qroke.com.br` e registrar o ID de medição `G-...`. Fluxo informado pelo responsável: `G-ZMWF4HFBV4`; substitui o identificador anterior. A conta, o fuso e a moeda ainda devem ser conferidos no painel.
3. [x] Implementar uma única integração, com um plugin Nuxt no cliente e `gtag.js` em um documento isolado, e uma configuração pública `NUXT_PUBLIC_GA_MEASUREMENT_ID`. ID vazio deve desativar a integração. Não instalar a mesma propriedade simultaneamente por plugin e Google Tag Manager.
4. [x] Antes de coletar, oferecer uma preferência de medição com aceitar, recusar e rever a escolha; documentar o uso dos dados. Como padrão inicial do projeto, carregar Analytics somente após aceite, manter recursos de publicidade desativados e respeitar a recusa.
5. [x] Implementar visualizações manuais `page_view` para as páginas públicas, com `send_page_view: false`, sem parâmetros ou fragmentos e com título do cadastro. A tag fica em /analytics-frame, sem observar o histórico ou os formulários do app. Os testes verificam um evento por navegação. No painel do fluxo, ainda conferir/desativar a medição otimizada automática.
6. [ ] Começar pelas páginas públicas. Para medir ações dentro das festas, remover query/hash e normalizar caminhos com IDs antes do envio. Revisar também `page_referrer`, títulos e medições automáticas. Desativar captura automática de formulários e termos de busca até haver sanitização verificada.
7. [ ] Implementar eventos abaixo somente após sucesso da operação e aceite de medição. Não usar texto livre como parâmetro.
8. [ ] Validar o recebimento real no DebugView, no relatório em tempo real e nas requisições do navegador: nenhum carregamento antes do aceite, nenhuma duplicação, nenhuma URL de convite ou dado pessoal. Os testes locais de navegador já cobrem aceite, recusa, revogação entre abas, recarga e URLs privadas sem enviar tráfego de teste à propriedade.
9. [ ] Definir retenção e filtros de tráfego interno; registrar o responsável pela propriedade. Marcar `create_party` e `join_party` como eventos principais depois de validar os disparos.

| Evento proposto | Momento                                             | Parâmetros permitidos                            |
| --------------- | --------------------------------------------------- | ------------------------------------------------ |
| `create_party`  | Criação confirmada                                  | nenhum                                           |
| `join_party`    | Entrada aceita                                      | `method: link, qr, pin`                          |
| `add_track`     | Pedido confirmado                                   | `source: youtube, local`; `karaoke: true, false` |
| `vote_track`    | Voto confirmado                                     | `reaction: like, dislike, undo`                  |
| `share_invite`  | Cópia/compartilhamento concluído quando verificável | `method: clipboard, native`                      |

Não enviar nome de festa, nome de participante, e-mail, PIN, token, identificador de aparelho, ID da festa, título de playlist ou texto digitado na busca.

Referências: [configurar GA4](https://support.google.com/analytics/answer/9304153), [medir aplicativos de página única](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications), [evitar dados pessoais](https://support.google.com/analytics/answer/6366371).

## 4. Vincular Search Console e GA4

- [ ] Com propriedade verificada no Search Console e permissão de editor no Analytics, abrir **Administrador → Vinculações de produtos → Vinculações do Search Console**.
- [ ] Selecionar a propriedade `qroke.com.br` e o fluxo Web correto, revisar e confirmar.
- [ ] Publicar a coleção de relatórios do Search Console na biblioteca de relatórios do GA4 se ela não estiver visível.

Referência: [vincular as duas plataformas](https://support.google.com/analytics/answer/10737381).

## 5. Descoberta por buscadores de IA

- [ ] Permitir o rastreamento das páginas públicas por Googlebot, Bingbot e OAI-SearchBot também no CDN/WAF. A regra genérica atual de robots permite as páginas públicas; não criar grupos específicos que esqueçam de repetir as restrições de APIs.
- [ ] Cadastrar/verificar o site no [Bing Webmaster Tools](https://www.bing.com/webmasters/) e enviar o mesmo sitemap; isso complementa a descoberta pelo ecossistema Bing/Copilot.
- [ ] Conferir que robôs conseguem ler, sem executar JavaScript, o que o QRokê faz, para quem serve e como usar. Manter respostas factuais nas páginas públicas e links entre elas.
- [ ] Manter marca, domínio, descrições e imagens consistentes em perfis oficiais e materiais do produto. Buscar menções editoriais autênticas, sem avaliações inventadas ou páginas repetidas para palavras-chave.
- [ ] Acompanhar visitas referidas por mecanismos de IA nos relatórios após ativar a medição. Registrar uma linha de base para consultas como “karaokê online com amigos”, “fila de músicas para festa” e “música por QR Code”, com data e contexto; os resultados variam.
- [ ] Tratar acesso para busca e uso para treinamento como decisões separadas. Não é necessário liberar um robô de treinamento para configurar OAI-SearchBot.

Não existe cadastro que garanta recomendação por IA. O Google informa que as práticas normais de SEO continuam válidas e não exige arquivo especial de IA. A OpenAI recomenda não bloquear OAI-SearchBot para permitir descoberta e citações.

Referências: [Google e recursos de IA](https://developers.google.com/search/docs/appearance/ai-features), [OpenAI para publishers](https://help.openai.com/en/articles/12627856), [diretrizes do Bing](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a).

## 6. Prévias de WhatsApp, Telegram, Messenger e Instagram

- [ ] Após publicar, abrir `https://qroke.com.br/brand/qroke-share-v2.jpg` sem login e confirmar JPEG 1200×630, carregamento rápido e logo legível.
- [ ] Verificar as tags `og:title`, `og:description`, `og:url`, `og:image`, tipo e dimensões no HTML original da home e de um convite de teste. A URL da imagem é HTTPS absoluta e não depende de cookies.
- [ ] Usar o [Sharing Debugger da Meta](https://developers.facebook.com/tools/debug/) para inspecionar a URL pública e solicitar nova leitura quando disponível. O novo nome da imagem evita reutilizar o arquivo anterior, mas cada serviço também pode manter cache da página.
- [ ] Fazer envios manuais para contas de teste próprias no WhatsApp, Telegram, Messenger e Instagram Direct. Registrar imagem, título, descrição, recorte, acesso ao link e comportamento no celular.
- [ ] Validar a home e um convite descartável separadamente. Não enviar convite real de administrador a ferramentas de inspeção.
- [ ] No Instagram, testar também os formatos efetivamente utilizados: Direct, bio e Stories não oferecem a mesma apresentação. Quando o formato não gerar cartão automaticamente, usar a arte com sticker/link ou a opção nativa disponível. O site fornece metadados; cada aplicativo decide como exibir a prévia.

Referência técnica: [Open Graph](https://ogp.me/).

## Critérios de conclusão

- [ ] Cinco páginas públicas publicadas e rastreáveis; convites e controles continuam não indexáveis.
- [ ] Sitemap aceito e domínio verificado; evidências anexadas sem credenciais.
- [ ] GA4 integrado, testado com preferência de medição e sem dados pessoais; Search Console vinculado.
- [ ] Prévias sociais conferidas nos aplicativos escolhidos, com limitações registradas.
- [ ] Registrar a data da publicação e a linha de base das métricas. Reavaliar resultados em 7, 14 e 30 dias, sem tratar esses prazos como garantia de indexação.

As verificações locais ficam em `scripts/browser-seo-check.mjs`; gerar novamente o cartão com `node scripts/generate-social-card.mjs`. Esta issue não agenda execuções automáticas.

## Manutenção do sitemap

O XML em /sitemap.xml e os metadados usam o cadastro explícito de páginas públicas
em shared/site.ts. O mapa navegável em /mapa-do-site mostra os nomes, descrições,
links e datas dessas páginas. Ao criar uma nova página pública, adicionar sua
rota, título, descrição e lastModified ao cadastro e um link de navegação relevante.

Atualizar lastModified quando o conteúdo principal, os dados estruturados ou os
links da página mudarem de forma relevante. A data inicial é 2026-10-01, quando as
páginas foram publicadas. Não usar a hora da requisição ou do deploy: uma correção
sem mudança de conteúdo não torna todas as páginas novas.

O arquivo não lista URLs privadas de festas, convites, buscas, player, administração,
APIs, redirecionamentos, parâmetros ou fragmentos. Títulos e descrições pertencem
ao HTML das páginas; não criar tags XML que o protocolo de sitemap não reconhece.
Não são usadas priority e changefreq, que o Google ignora. O sitemap XML continua
na mesma URL informada ao Search Console.

Referência: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
