# QRoke: MongoDB, Dragonfly e produção

A versão de produção atende festas isoladas por organizationId e partyId. MongoDB armazena participantes, votos, fila, dispositivos, reservas de administração e OAuth cifrado. Dragonfly mantém cache do catálogo, presença temporária, limites compartilhados e notificações para todas as instâncias.

## Executar e testar

Node 24. Subir as dependências descartáveis com docker compose -p qroke-tests -f compose.test.yml up -d --wait. MongoDB de teste usa o mesmo release de produção e replica set de um nó.

Executar npm ci, npm run typecheck, npm test, npm run test:storage, npm run build, npm run test:integration, npm run test:distributed, npm run test:load e npm run test:browser. A suíte de navegador inclui a entrada por convite. Os testes não acessam os bancos de produção.

A regressão da busca do YouTube é coberta em três níveis: `tests/media-integration.mjs` chama as rotas HTTP reais com e sem escopo de festa; `tests/catalog.test.ts` simula a recusa da chave pelo Google; `scripts/browser-search-check.mjs` testa a busca na interface, o aviso de erro e uma nova tentativa após a recuperação. O roteiro de navegador faz parte de `npm run test:browser` e do CI. Seus dados são isolados e não dependem do YouTube real.

Para verificar a configuração externa, executar `npm run test:youtube:key` no ambiente de origem das chamadas, com `NUXT_YOUTUBE_API_KEY` ou `YOUTUBE_API_KEY` configurada. Esse teste opt-in realiza uma chamada real `videos.list`, sem busca de emergência ou alteração de festas, e falha se o Google recusar a chave. Não imprime a chave nem a URL autenticada. Validar em uma máquina local não comprova a permissão do IP de produção; a configuração efetiva do servidor precisa da mesma conferência. Esse teste não integra o CI comum, que não recebe credenciais de produção. A pendência atual da chave está na [issue #19](https://github.com/nwxdev/qroke/issues/19).

## Configuração

- QROKE_MONGODB_URI e QROKE_MONGODB_DATABASE: conexão e banco exclusivos.
- QROKE_DRAGONFLY_URL: serviço existente pela rede privada.
- QROKE_PUBLIC_URL=https://qroke.com.br.
- NUXT_PUBLIC_GA_MEASUREMENT_ID: ID público do fluxo GA4. O fluxo informado é G-16BRNZ1KP8. Vazio desativa a integração; o .env local não é enviado ao servidor.
- QROKE_ACCESS_REQUIRED=true e QROKE_TRUST_PROXY=true na stack privada atrás do Nginx.
- QROKE_HOST_PIN: PIN com 4 a 8 dígitos da festa original. Festas novas exigem PIN próprio de 6 dígitos.
- QROKE_SESSION_SECRET: segredo aleatório de pelo menos 32 caracteres.
- QROKE_ENCRYPTION_KEY: 32 bytes em hexadecimal para AES-256-GCM.
- YOUTUBE_API_KEY, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REDIRECT_URI.
- QROKE_RUNTIME_CONFIG_FILE: arquivo JSON montado por Docker Secret. Valores nunca entram na imagem.
- QROKE_MUSIC_DIR: opcional; múltiplas instâncias exigem a mesma biblioteca acessível em todas.

Acesso inicial: / para criar uma festa de 24 horas ou retomar festas deste navegador. A festa original continua acessível por /entrar com o PIN existente. Consulte [Festas simultâneas](multisession.md) para ciclo de vida, isolamento e publicação. Gerar novo convite revoga as entradas anteriores dos convidados; o anfitrião mantém seu acesso. A reserva de controles continua com duração configurável.

O retorno Google deve ser cadastrado exatamente como https://qroke.com.br/api/youtube/callback. Autorização Google dá acesso às playlists pessoais, sem conceder administração.

## Apresentação pública e SEO

A página inicial apresenta o QRokê sem exigir convite, oferece criação de festas e lista “Suas festas” para quem já entrou neste navegador. As APIs continuam protegidas. As páginas públicas /, /como-funciona, /karaoke-online, /perguntas-frequentes e /mapa-do-site têm título, descrição, canonical e conteúdo renderizado no servidor. Open Graph, Twitter Card e dados estruturados de site, aplicativo, página, navegação e FAQ usam https://qroke.com.br. Metadados de convites usam apenas o caminho público de entrada, sem query, fragmento, PIN, token ou nomes de participantes.

A indexação só é habilitada quando QROKE_PUBLIC_URL corresponde ao domínio de produção. robots.txt aponta para sitemap.xml, que contém as cinco páginas públicas e a data da última atualização relevante de cada uma. /mapa-do-site oferece links, descrições e datas em uma página navegável. As datas ficam no cadastro shared/site.ts e não mudam a cada requisição ou deploy. Busca, anfitrião, player, QR, TV, APIs e entradas de festas recebem noindex; /entrar e as entradas /f/:id/entrar usam canonical próprio, sem parâmetros. Ambientes locais bloqueiam rastreamento.

As rotas /sitemap.xml e /robots.txt atendem GET e HEAD com o mesmo tipo de conteúdo e a mesma política de cache. As rotas HEAD reutilizam os handlers GET para evitar que verificações de cabeçalhos caiam na página 404 do Nuxt. O teste de SEO cobre Googlebot, Google-InspectionTool e navegador comum, além da leitura do XML. A URL a enviar ao Search Console é exatamente https://qroke.com.br/sitemap.xml, sem www e com HTTPS; as variantes HTTP/www redirecionam.

Os ícones para navegador e celular e a imagem de compartilhamento ficam em public/. O cartão social /brand/qroke-share-v2.jpg tem 1200 x 630 pixels e usa a logo original. Pode ser regenerado com node scripts/generate-social-card.mjs. O roteiro de publicação, Search Console, Analytics e prévias sociais está em [SEO e descoberta](seo-rollout.md) e na [issue #12](https://github.com/nwxdev/qroke/issues/12). O manifesto usa os ícones de 192 e 512 pixels; não há funcionamento offline.

## Concorrência e limites

Cada comando que modifica a festa usa uma transação no replica set MongoDB. A versão do documento da festa serializa comandos concorrentes. Tokens de convidados e aparelhos são armazenados por hash; tokens Google são cifrados com contexto da festa. Estados OAuth e tickets são consumidos atomicamente.

Cada festa admite até 2000 itens na fila, 200 pedidos avulsos pendentes por convidado e 2000 participantes/aparelhos cadastrados. O histórico de reprodução usado pelo algoritmo é limitado às últimas 100 ocorrências. Capacidade simultânea deve ser medida na VPS; esses limites não são uma promessa de throughput.

Notificações não são armazenamento durável: clientes consultam o estado completo após reconnect e periodicamente. O banco preserva fila e reservas mesmo após queda do Dragonfly. Limites de acesso falham de forma fechada quando o Dragonfly está indisponível.

## Entrega

O CI valida código e dependências reais, publica ghcr.io/nwxdev/qroke com o SHA completo e atualiza somente o serviço QRoke pelo comando SSH restrito. A infraestrutura vive em nwx_infra; consultar docs/runbooks/qroke.md nesse repositório.

A reversão troca a imagem; não apaga nem desfaz o banco. Migrações devem manter compatibilidade entre versões. Backups devem incluir qroke_prod, com restauração ensaiada em banco separado.

## Reprodução e segundo plano

Consulte [Reprodução durante a festa](player-background.md) para mini player de computador, tela ligada, contagem de karaokê e limites de Chrome no celular/PWA. YouTube exige vídeo visível; a biblioteca local usa áudio nativo e precisa ser provisionada no servidor.

## Limitações operacionais

A primeira instalação usa a VPS atual. Duas instâncias não protegem contra falha do host. Escalar entre servidores exige redundância do MongoDB e do Dragonfly, backups externos e nova autenticação no registry ao adicionar nós. Os testes de API e navegador simulam YouTube; o login Google real e áudio em celular/TV devem ser verificados após configurar o callback de produção.

## Medição de visitas

A tag GA4 só é carregada depois do aceite em “Cookies opcionais”. O aviso compacto fica centralizado na parte inferior, com aceitar/recusar lado a lado e detalhes expansíveis; a preferência pode ser revista pelo rodapé.
O rodapé das páginas públicas permite reabrir “Preferências de medição”.
A escolha é salva neste navegador e sincronizada entre abas; recusar interrompe
a medição e remove os cookies host-only _ga. Isso não exclui dados já coletados.
ID vazio desativa tanto a interface quanto a coleta. Não instalar outra tag do
mesmo fluxo em paralelo.

O plugin analytics.client.ts monta um documento descartável /analytics-frame.
Esse documento recebe apenas caminhos do cadastro PUBLIC_PAGES e referências
sanitizadas. A tag fica nesse documento para não observar formulários, buscas,
links de convite ou alterações de histórico do aplicativo. As rotas privadas
removem o documento antes da navegação; voltar a uma página pública pode retomá-lo
se o consentimento continuar aceito. A revogação desativa o envio antes de remover
o documento, inclusive com o script ainda carregando.

As visitas usam page_view manual, send_page_view=false, título do cadastro e
URL canônica sem parâmetros ou fragmentos. O referenciador externo mantém só a
origem. Publicidade e Google Signals ficam desativados, com cookies host-only de
até 180 dias. O Google ainda recebe dados técnicos da requisição e do aparelho;
não apresentar essa medição como anônima. Não medimos ações dentro das festas
nesta etapa. O isolamento não é um sandbox para scripts maliciosos: é uma separação
do contexto de navegação usado pela tag oficial.

No fluxo Web, desativar a medição otimizada automática (histórico, formulários,
buscas, saídas, downloads e vídeos) para manter somente os eventos definidos.
O documento da tag já não contém histórico, formulários ou links do aplicativo.
Validar recebimento em Tempo real/DebugView na conta responsável; os testes locais
interceptam a coleta e não alimentam a propriedade real.

Teste: node scripts/browser-analytics-check.mjs. Inclui ausência de tag antes do
aceite, recusa persistida, contagem por navegação, URL privada rejeitada, referência
limpa, revogação entre abas, cookies removidos, ID vazio e layouts claro/escuro.

## TV e códigos de conexão

Consulte [TV e usabilidade do karaokê](tv-usability.md) para conexão por quatro caracteres, contagem de 10 segundos e teste físico no Silk. A pesquisa para evolução do catálogo está em [Música licenciada no Brasil](music-licensing-br.md); o provedor permanece YouTube.
