# QRoke: MongoDB, Dragonfly e produção

A versão de produção atende festas isoladas por organizationId e partyId. MongoDB armazena participantes, votos, fila, dispositivos, reservas de administração e OAuth cifrado. Dragonfly mantém cache do catálogo, presença temporária, limites compartilhados e notificações para todas as instâncias.

## Executar e testar

Node 24. Subir as dependências descartáveis com docker compose -p qroke-tests -f compose.test.yml up -d --wait. MongoDB de teste usa o mesmo release de produção e replica set de um nó.

Executar npm ci, npm run typecheck, npm test, npm run test:storage, npm run build, npm run test:integration, npm run test:distributed, npm run test:load e npm run test:browser. A suíte de navegador inclui a entrada por convite. Os testes não acessam os bancos de produção.

## Configuração

- QROKE_MONGODB_URI e QROKE_MONGODB_DATABASE: conexão e banco exclusivos.
- QROKE_DRAGONFLY_URL: serviço existente pela rede privada.
- QROKE_PUBLIC_URL=https://qroke.com.br.
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

A página inicial apresenta o QRokê sem exigir convite, oferece criação de festas e lista “Suas festas” para quem já entrou neste navegador. As APIs continuam protegidas. Título, descrição, canonical, Open Graph, Twitter Card e dados estruturados WebSite usam https://qroke.com.br. URLs de convite e parâmetros da festa não entram nos metadados.

A indexação só é habilitada quando QROKE_PUBLIC_URL corresponde ao domínio de produção. robots.txt aponta para sitemap.xml, que contém apenas a página inicial. Busca, anfitrião, player, QR, TV e APIs recebem noindex; a entrada alternativa /entrar aponta o canonical para /. Ambientes locais bloqueiam rastreamento.

Os ícones para navegador e celular e a imagem de compartilhamento ficam em public/. O manifesto usa os ícones de 192 e 512 pixels; não há funcionamento offline.

## Concorrência e limites

Cada comando que modifica a festa usa uma transação no replica set MongoDB. A versão do documento da festa serializa comandos concorrentes. Tokens de convidados e aparelhos são armazenados por hash; tokens Google são cifrados com contexto da festa. Estados OAuth e tickets são consumidos atomicamente.

Cada festa admite até 2000 itens na fila, 200 pedidos avulsos pendentes por convidado e 2000 participantes/aparelhos cadastrados. O histórico de reprodução usado pelo algoritmo é limitado às últimas 100 ocorrências. Capacidade simultânea deve ser medida na VPS; esses limites não são uma promessa de throughput.

Notificações não são armazenamento durável: clientes consultam o estado completo após reconnect e periodicamente. O banco preserva fila e reservas mesmo após queda do Dragonfly. Limites de acesso falham de forma fechada quando o Dragonfly está indisponível.

## Entrega

O CI valida código e dependências reais, publica ghcr.io/nwxdev/qroke com o SHA completo e atualiza somente o serviço QRoke pelo comando SSH restrito. A infraestrutura vive em nwx_infra; consultar docs/runbooks/qroke.md nesse repositório.

A reversão troca a imagem; não apaga nem desfaz o banco. Migrações devem manter compatibilidade entre versões. Backups devem incluir qroke_prod, com restauração ensaiada em banco separado.

## Limitações operacionais

A primeira instalação usa a VPS atual. Duas instâncias não protegem contra falha do host. Escalar entre servidores exige redundância do MongoDB e do Dragonfly, backups externos e nova autenticação no registry ao adicionar nós. Os testes de API e navegador simulam YouTube; o login Google real e áudio em celular/TV devem ser verificados após configurar o callback de produção.
