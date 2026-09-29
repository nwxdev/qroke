# QRokê

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/brand/qroke-dark.png">
  <img src="public/brand/qroke-light.png" alt="QRokê" width="320">
</picture>

Uma jukebox para festas na rede local. Cada convidado escolhe músicas e playlists pelo celular; a fila combina rodízio, votos e controle do anfitrião, e um único dispositivo reproduz o som. Música, vídeo e karaokê compartilham a mesma fila.

> Implementação da [issue #1 — execução da v1](https://github.com/nwxdev/qroke/issues/1), baseada em [docs/plano.md](docs/plano.md).
> Trabalho concentrado em **`codex/qroke-v1`**, na worktree **`/home/rpolan/projects/nwx/qroke-v1`**. Nenhum PR ou push realizado. Abrir PR somente depois dos testes e da aprovação do responsável.

## Identidade visual

A marca aplicada é a [referência compartilhada pelo responsável](https://chatgpt.com/s/m_6abafc8390448191b356f57c08889c5f): mascote com microfone, lettering QRokê, verde-lima e detalhes laranja. Os três PNGs originais transparentes (2172 × 724) estão em `public/brand/`, sem redesenho, filtros ou alteração de proporções.

- `qroke-dark.png`: letras claras para fundos escuros.
- `qroke-light.png`: letras pretas para fundos claros.
- `qroke-lime.png`: alternativa original com detalhes em lima, preservada para aplicações futuras.
- `BrandLogo.vue`: componente único com versão automática pelo tema; `tone="dark"` mantém a versão clara nas superfícies permanentemente escuras do player. A troca usa CSS, inclusive antes da hidratação, sem depender de uma chamada externa.
- Aplicações: cabeçalhos de busca, anfitrião e player; entrada por PIN; convite junto ao QR; espera do player; rodapé da busca e este README. Logo em um link usa o nome acessível do link, evitando leitura duplicada.
- Cores de marca: lima `#c4f332` e laranja `#ff5a24`. Textos/ações usam variações com contraste: verde `#48651c` e laranja `#b13c17` no claro; lima e coral `#ff784a` no escuro. Não aplicar verde-lima como texto pequeno sobre branco.
- O QR permanece preto sobre branco, com margem de quatro módulos e marca **fora** do código. Nenhuma marca cobre o iframe do YouTube, legendas ou controles; o botão de ativar som mantém sua posição.
- Os logos são servidos pelo próprio aplicativo; o link compartilhado é apenas a referência de origem, não uma dependência da interface. Ao atualizar os arquivos, preservar transparência, proporção 3:1, contraste e nome acessível. No celular, os cabeçalhos acomodam os comandos em linhas separadas quando necessário.

## Conferência dos pedidos — 28/09/2026

Os pedidos desta conversa foram confrontados com o código e os testes. **Implementado** significa presente nesta branch; não substitui os testes físicos listados no aceite. Pedidos posteriores de separar as três páginas substituem a organização antiga, em que busca e administração ficavam juntas.

| Pedido acumulado                                                                       | Estado e evidência                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Uma worktree, uma branch `codex/`, sem PR                                              | Mantido em `codex/qroke-v1`; alterações e documentação concentradas nesta worktree. Sem push, PR ou deploy.                                                                                                                                                        |
| Iniciar ao adicionar na fila vazia; scroll sem parar; pular só uma                     | Implementado. Início após autorização/seleção do PLAYER, mesma instância durante scroll e avanço protegido pelo ID da faixa; testes de autostart, layout e playback.                                                                                               |
| Três telas; admin isolado; PIN em popup; sair no topo e expirar para busca             | Implementado em `/busca`, `/host` e `/player`. PIN e lease exclusiva configuráveis no `.env`, disputa simultânea e logout/expiração testados.                                                                                                                      |
| Busca por Enter; fila acima, quatro cards e slider; botão de busca na fila vazia       | Implementado na tela de busca, com setas, arrasto horizontal e adaptação ao celular; testes de layout, navegação e karaokê.                                                                                                                                        |
| Nome evidente/editável; pessoas na festa; like/dislike e retirar reação                | Implementado. Saldo negativo desce na fila, segundo clique remove, troca altera o voto; presença e nome cobertos pelos testes sociais.                                                                                                                             |
| Playlists pessoais, públicas/de outros canais e convidados sem admin                   | Implementado para listas disponíveis pela API. Nome de participante basta para listas públicas; Google só é solicitado para a conta pessoal. Mixes automáticos e listas especiais do YouTube podem não estar disponíveis.                                          |
| Expandir playlist no resultado; adicionar uma ou todas; dedupe; card com nome/autor    | Implementado e testado. Inclusão individual fica avulsa; lote conserva origem. Autor aparece no cabeçalho da playlist, sem repetição nas faixas; posições/estado já na fila permanecem visíveis.                                                                   |
| Login Google diretamente no celular                                                    | **Condicionado ao HTTPS:** OAuth está implementado e o login local foi confirmado pelo responsável. O ambiente por IP LAN HTTP ainda não oferece callback válido para o celular. A solução está no plano de acesso externo; não foi publicada.                     |
| QR sem localhost, sempre disponível no karaokê, copiar link e regenerar após falha     | Implementado: verificação periódica da URL, regeneração após mudança válida e aviso/ocultação quando indisponível. Testado com falhas simuladas. Encaminhamento LAN configurado; leitura/acesso nos celulares que falharam ainda requer aceite físico.             |
| Voltar música; volume remoto; adicionar/selecionar/renomear/remover aparelhos          | Implementado. Volume confirmado pelo responsável. Identificação inclui navegador, sistema/modelo quando informado, versão do app e tela atual. Bluetooth é pareado no sistema operacional; Cast, sincronização multiroom e instalação PWA não foram implementados. |
| Ocultar versões recusadas ou bloqueadas por país                                       | Implementado com validação regional, filtro de IDs recusados e pausa para evitar saltos em cascata. Não há contorno de restrições; a API pode não antecipar todas as recusas do iframe.                                                                            |
| Marca, temas claro/escuro, ícones, microanimações e responsividade                     | Implementado. Marca original aplicada, contraste e movimento reduzido verificados; matriz de navegador de 320 a 1440 px. Animações são Vue/CSS, sem exigir biblioteca Morph.                                                                                       |
| Player ocupar a janela, QR afastado, header menor e status de som no botão             | Implementado; desktop/TV usa a altura disponível, mobile permite scroll. Ativar som muda para Som autorizado/Som ativo na mesma posição, com administração somente no host.                                                                                        |
| Karaokê com vários participantes, contagem configurável, vinheta e destaque da próxima | Implementado. Padrão 5 s, ajuste pelo anfitrião, contagem em tela cheia, número traçado e título animados, participantes destacados.                                                                                                                               |
| Grupo laranja e prioridade das músicas de karaokê                                      | Implementado no player e no servidor, inclusive após restart e ao pular/terminar. A fila também fica acessível abaixo do vídeo no celular, sem ocupar o espaço do QR.                                                                                              |
| Acesso por qualquer internet, código/link, aluguel e planos                            | **Plano somente**, conforme solicitado: domínio HTTPS, convite por festa, isolamento de várias festas, operação e cobrança por etapas. Sem geolocalização obrigatória e sem publicação da v1 LAN.                                                                  |
| Consultar `nwx_infra`                                                                  | Repositório localizado e README consultado; nenhuma alteração de infraestrutura nem conexão/deploy na VPS realizada nesta entrega.                                                                                                                                 |
| Testar tudo e documentar                                                               | Suítes unitária, integração e navegador, TypeScript, build e formatação; resultados atuais e limites de testes físicos em **Testar**.                                                                                                                              |

Esta conferência também corrigiu duas lacunas visuais: o vídeo não esticava para preencher a altura disponível e uma regra antiga ocultava a fila de karaokê no celular. Os testes agora exigem a altura do vídeo e a presença do grupo em telas pequenas, além da separação do QR.

## Player: janela, status e karaokê

Revisão dos pedidos de 28/09/2026:

| Pedido                                   | Comportamento implementado                                                                                                                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| QR afastado do vídeo                     | No modo vídeo, o convite fica em um cartão próprio, separado do vídeo por pelo menos 28 px no desktop. No celular fica abaixo, com espaçamento.                                                                                                                                                                          |
| Cabeçalho menor e som menos predominante | Logo e controles compactos; o botão fica à direita e deixa de ocupar o centro. Mantém posição/tamanho ao ativar e ao trocar de modo.                                                                                                                                                                                     |
| Status no próprio botão                  | **Ativar som / Nesta tela** antes do gesto; **Som autorizado / Aguardando seleção** se outro aparelho é o PLAYER; **Som ativo / Nesta tela** quando este aparelho está autorizado e selecionado. Reconexão aparece explicitamente. O botão continua clicável para reautorizar o áudio se o navegador exigir outro gesto. |
| Aproveitar a janela em desktop/TV        | A partir de 1024 px de largura, `/player` ocupa `100dvh`, sem rolagem da página. Fila e painéis usam rolagem interna quando o conteúdo excede sua área. O vídeo usa a área restante, com tamanho mínimo do iframe de 200 × 200. Em música, convite, player compacto e fila dividem a largura.                            |
| Manter scroll no celular                 | Abaixo de 1024 px, a página usa rolagem natural, com a fila de karaokê abaixo do vídeo e uma coluna reservada para o QR. O cabeçalho permanece fixo e o iframe mantém o comportamento de mini player.                                                                                                                    |
| Autor da playlist sem repetição          | Nome no cabeçalho da playlist; retirado das faixas internas, cartões e próximas quando vinculados à playlist. Faixas avulsas continuam identificando o solicitante. Nomes dos cantores permanecem, pois são participantes, não repetição de autoria.                                                                     |
| Transição preenchendo a tela             | Em `/player`, a preparação do karaokê cobre a janela, mantém QR e cabeçalho acessíveis e reserva espaço para eles. Contagem grande com traçado animado, título revelado por palavras e participantes em destaque. A saída da camada não cobre o vídeo já iniciado.                                                       |
| Música e participantes evidentes         | Nome da faixa em destaque e caixa **Quem canta** com todas as pessoas selecionadas. Contagem usa o prazo configurado pelo anfitrião (padrão de cinco segundos), sem alterar a sincronização nem a vinheta. Movimento reduzido desativa os efeitos.                                                                       |
| Grupo laranja de karaokê                 | Todas as faixas marcadas como karaokê aparecem no grupo **Karaokê**, usando o laranja do tema, quantidade e indicação de prioridade. Playlists mantêm subgrupos e autoria; faixas avulsas mantêm identidade e participantes.                                                                                             |
| Sequência preferencial de karaokê        | Enquanto a faixa atual é karaokê, os pedidos de karaokê vêm antes dos pedidos comuns; a escolha vale também ao terminar, pular ou ignorar uma faixa indisponível. Ao acabar o grupo, a fila retoma as músicas comuns. A faixa que já toca nunca é interrompida por uma inclusão.                                         |

A prioridade é calculada no **servidor** e salva com a fila. Dentro de cada categoria continuam ordem manual, votos e rodízio; pedidos humanos continuam antes da continuação automática. Durante o karaokê, reordenar não pode colocar uma faixa comum antes de uma de karaokê: o servidor explica a restrição e os botões de mover respeitam a separação. Fora de uma sequência de karaokê, vale a ordenação normal. Os números nas músicas indicam a posição real de reprodução, inclusive nos grupos recolhidos.

O status **Som ativo** confirma autorização do navegador e seleção deste dispositivo; não mede volume da caixa, mute do sistema ou se o vídeo está pausado. Para ajustar o volume e escolher aparelhos, usar `/host`. Não é necessário instalar PWA para esse botão funcionar.

A aparência foi alterada mantendo os fluxos existentes de PIN exclusivo/expiração, busca por Enter, playlists/OAuth, deduplicação, participantes, votos, volume, anterior/pular e identificação dos aparelhos. Acesso por qualquer internet e planos comerciais continuam no planejamento descrito abaixo; esta rodada não publica o serviço, não cria PWA/HTTPS e não altera a VPS.

## Começar

Requisitos: **Node.js 22.12+** (validado com **24.17.0**) e npm. No Windows, instale dependências pelo Node do Windows; no WSL, pelo Node do Linux. Não compartilhe `node_modules` entre esses sistemas: o SQLite usa um módulo nativo.

```bash
cd /home/rpolan/projects/nwx/qroke-v1
npm ci
test -f .env || cp .env.example .env
# Edite .env: escolha QROKE_HOST_PIN e confira a porta/URL da rede.
npm run dev
```

Nesta worktree foi preparado um `.env` privado com a chave fornecida, porta 3100 e PIN administrativo aleatório. Consulte ou altere `QROKE_HOST_PIN` nesse arquivo antes de testar; ele não está no Git. Não substitua o arquivo pelo exemplo, para preservar a chave.

O servidor escuta em `0.0.0.0`. A porta padrão é 3000, alterável por `QROKE_PORT`. Nesta máquina, a porta 3000 já estava ocupada durante a análise; use **3100** para evitar interferir no serviço existente.

Para produção local:

```bash
npm run build
npm start
```

`npm start` carrega `.env` e traduz as variáveis para o runtime Nuxt. Se iniciar diretamente com `node .output/server/index.mjs`, use os nomes `NUXT_*` e `NITRO_PORT` correspondentes; o servidor compilado não carrega `.env` sozinho.

| Rota         | Uso                                                            |
| ------------ | -------------------------------------------------------------- |
| `/busca`     | Entrada por nome, pesquisa, playlists e pedidos/votos          |
| `/host`      | Administração com PIN, fila, volume, karaokê e aparelhos       |
| `/player`    | Reprodução de música/vídeo/karaokê, QR e ativação local de som |
| `/`          | Redireciona para `/busca`                                      |
| `/tv`, `/qr` | Redirecionam para `/player`                                    |

### Configuração

| Variável                | Padrão / significado                                                                                                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QROKE_HOST_PIN`        | Obrigatório para administrar. De 4 a 8 dígitos; não existe PIN embutido no app. O `1234` do exemplo deve ser trocado.                                                                                                                                          |
| `QROKE_PORT`            | `3000`. Porta HTTP usada por dev e `npm start`.                                                                                                                                                                                                                |
| `QROKE_PUBLIC_URL`      | URL acessível na LAN, como `http://192.168.31.95:3100`. Sem valor, usa a origem da aba somente se ela for compartilhável. Localhost, loopback e endereços de escuta não geram QR. A URL do .env é relida pelo monitor a cada checagem, sem reiniciar o player. |
| `YOUTUBE_API_KEY`       | Opcional. Validação oficial, busca de emergência e playlists públicas por link. Exclusiva do servidor.                                                                                                                                                         |
| `YOUTUBE_CLIENT_ID`     | Opcional. Client ID OAuth do tipo Aplicativo da Web, para playlists pessoais.                                                                                                                                                                                  |
| `YOUTUBE_CLIENT_SECRET` | Segredo do cliente OAuth; exclusivo do servidor e nunca versionado.                                                                                                                                                                                            |
| `YOUTUBE_REDIRECT_URI`  | Padrão: http://localhost:PORTA/api/youtube/callback. Deve coincidir exatamente com o URI autorizado no Google.                                                                                                                                                 |
| `QROKE_INVITE_ENV_FILE` | `.env`. Arquivo relido pelo monitor do QR para obter QROKE_PUBLIC_URL; vazio mantém apenas a configuração do processo.                                                                                                                                         |
| `QROKE_MUSIC_DIR`       | Pasta de músicas, incluindo subpastas. Vazia desabilita a biblioteca local.                                                                                                                                                                                    |
| `QROKE_QUOTA_DAILY_CAP` | `90` **requisições de busca oficial por dia**, não unidades. Cache hits não consomem essa reserva.                                                                                                                                                             |
| `QROKE_DATABASE`        | `.data/qroke.sqlite`, relativo ao diretório em que o processo inicia.                                                                                                                                                                                          |

`.env`, banco, arquivos gerados e capturas de teste estão no `.gitignore`. Só `.env.example` é versionado. Use um único processo Node e um único banco para cada festa.

### Como definir o PIN do anfitrião

Edite **o `.env` da worktree que está rodando**, não o checkout original:

- Linux: `/home/rpolan/projects/nwx/qroke-v1/.env`.
- Windows: `\\wsl.localhost\Ubuntu\home\rpolan\projects\nwx\qroke-v1\.env`.

Altere apenas `QROKE_HOST_PIN` para um PIN escolhido por você, com **4 a 8 dígitos**. Preserve `YOUTUBE_API_KEY` e as demais linhas. Exemplo ilustrativo, não use como PIN definitivo:

```dotenv
QROKE_HOST_PIN=583729
QROKE_ADMIN_LEASE_SECONDS=120
QROKE_PORT=3100
QROKE_PUBLIC_URL=http://192.168.31.95:3100
```

Encerre o processo antigo com Ctrl+C no terminal que iniciou o servidor e execute `npm start` novamente dentro da worktree. Depois abra `/host` e digite o PIN. Reiniciar não apaga a fila. O PIN não é enviado aos convidados e não é uma credencial do Google. Não existe PIN padrão embutido nem configuração do PIN pelo navegador.

### Rede Windows / WSL

Diagnóstico em **26/09/2026**:

- Windows Wi-Fi: **`192.168.31.95`**, perfil **Privado**.
- WSL Ubuntu: **`172.25.210.47`**, `wslinfo --networking-mode` retornou **`nat`**.
- Aplicação no WSL: `0.0.0.0:3100`; Windows alcança o app em `localhost:3100`.
- Antes da correção, o Windows escutava 3100 somente em `127.0.0.1`. Havia encaminhamento de outro serviço na porta 3000, mas nenhum para 3100. Isso explica localhost funcionar no PC e falhar no celular.
- O adaptador virtual **Topaz Loopback** também apresenta um endereço com aparência pública. Ele não comprova acesso de entrada pela internet e não foi escolhido para a festa.

Na mesma rede Wi-Fi, use **`http://192.168.31.95:3100/`**. Não é necessário contratar IP público, abrir porta no roteador ou usar o IP privado do WSL no celular. A URL foi salva em `QROKE_PUBLIC_URL` no `.env` privado desta worktree. O QR usa essa URL mesmo quando o PC abre o app por localhost. Se não houver URL compartilhável, mostra uma orientação em vez de gerar um QR de localhost.

#### Encaminhar a porta no modo NAT

Com `npm start` ativo, abra **PowerShell como administrador** e execute o script versionado:

```powershell
& '\\wsl.localhost\Ubuntu\home\rpolan\projects\nwx\qroke-v1\scripts\wsl-lan.ps1' -ListenAddress 192.168.31.95 -Port 3100
```

O script consulta o IPv4 atual do Ubuntu, confirma que o servidor responde, cria um `portproxy` do **IP privado do Wi-Fi:3100** para **WSL:3100**, e uma regra de firewall apenas para **TCP 3100, perfil Privado, interface selecionada e origem LocalSubnet**. Recusa endereços públicos, conflitos com serviços/mapeamentos existentes sem identificação QRokê e interfaces de rede pública. Não altera outras portas nem desativa o firewall. Repita após reiniciar o WSL se seu IP mudar.

Para desfazer apenas essa configuração:

```powershell
& '\\wsl.localhost\Ubuntu\home\rpolan\projects\nwx\qroke-v1\scripts\wsl-lan.ps1' -ListenAddress 192.168.31.95 -Port 3100 -Remove
```

Se o IP do Wi-Fi mudar, remova o encaminhamento antigo, execute com o IP novo, atualize `QROKE_PUBLIC_URL` e reinicie o app. Uma reserva DHCP no roteador evita a troca frequente do endereço.

Configuração aplicada nesta máquina: encaminhamento e firewall criados com elevação do Windows; **HTTP 200 confirmado em `http://192.168.31.95:3100/api/state`**. Os filtros foram conferidos: IP local 192.168.31.95, origem LocalSubnet, perfil Privado e porta TCP 3100. **O teste físico no celular ainda depende do responsável.**

Valide no PC e depois no celular:

1. Abra `http://192.168.31.95:3100/api/state`; deve retornar JSON.
2. No celular, conectado ao mesmo Wi-Fi, abra `http://192.168.31.95:3100/` e depois escaneie o QR.
3. Se o PC funciona e o celular não: confira isolamento de clientes/rede de convidados no roteador, VPN e perfil Privado. O teste no próprio PC não comprova o caminho físico do celular.

O modo espelhado do WSL é outra possibilidade, com configuração e firewall Hyper-V próprios. Não foi alterado, pois exigiria reiniciar o WSL e afetaria outros serviços. Rodar o app nativamente no Windows também elimina o encaminhamento para o WSL, mas exige instalar as dependências nativas nesse sistema. Referência: [rede do WSL — Microsoft](https://learn.microsoft.com/en-us/windows/wsl/networking).

#### Possibilidades para acesso fora do Wi-Fi

| Opção                                   | Endereço / alcance                                             | Adequação                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LAN do Windows                          | `http://192.168.31.95:3100/`, mesma rede                       | Caminho escolhido para a festa; QR simples, sem conta ou aplicativo no celular.                                                                                                                                                                                                                                                                                                |
| VPN privada + Tailscale Serve           | HTTPS acessível aos dispositivos autorizados da rede Tailscale | Opção para acesso pessoal remoto; exige configurar dispositivos e permissões. [Documentação](https://tailscale.com/docs/features/tailscale-serve).                                                                                                                                                                                                                             |
| Túnel HTTPS Cloudflare                  | Domínio HTTPS que encaminha ao servidor                        | Permite acesso externo sem usar o IP de entrada do roteador; precisa definir autenticação e política de acesso antes de publicar a festa. Quick Tunnel é temporário, sem SLA, com limite de 200 requisições simultâneas e sem SSE. [Documentação](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/). |
| IP público + encaminhamento no roteador | Depende do provedor, NAT/CGNAT, DNS e TLS                      | Maior manutenção; não foi configurado nem foi confirmada a disponibilidade de IP público de entrada.                                                                                                                                                                                                                                                                           |

A v1 foi projetada para LAN: visitantes podem entrar e pesquisar sem autenticação de conta; o PIN protege os controles administrativos. Expor a festa externamente exige definir proteção para convidados, catálogo/quota e proxy confiável, além de validar WebSocket e cookies por HTTPS. Um túnel público foi **avaliado, não ativado**. O IP público de **saída**, usado nas restrições da API do Google, tem finalidade diferente do endereço que os convidados usam para acessar a festa.

### Interface, player e acesso do anfitrião

- **Player e convite:** `/player` reúne os modos Música, Vídeo e Karaokê; `/qr` e `/tv` são aliases. QR, fila e reprodução se adaptam à janela conforme a matriz acima.
- **Busca:** em `/busca`, a fila vem antes da pesquisa em um carrossel. Telas grandes exibem quatro cartões; tablets, dois; celulares, um cartão e parte do próximo para indicar o arrasto. Setas, toque, trackpad e teclado percorrem a lista. A reordenação administrativa permanece em `/host`.
- **Enter:** o campo de busca aceita Enter e anuncia a ação no teclado do celular. O envio é bloqueado durante uma consulta em andamento para evitar duplicação.
- **Feedback:** adicionar muda o botão para confirmação com animação curta; entradas, saídas, reordenação e legenda do player têm transições Vue/CSS e respeitam `prefers-reduced-motion`.
- **Scroll:** o YouTube passa a mini player quando menos de 60% do espaço original está visível. O mesmo iframe continua tocando, com pelo menos 200 × 200 px; **Voltar** retorna ao local original. Uma aba oculta ainda pausa o vídeo. Desktop mantém a página na altura da janela e rolagem interna nos painéis.
- **Karaokê:** QR permanente em coluna reservada, inclusive durante a preparação e nos cinco segundos finais. A fila aparece ao lado no desktop e abaixo do vídeo no celular; QR e mini player ocupam lados diferentes.
- **Temas:** botões usam a cor de contraste do tema; textos dentro da superfície escura do player mantêm sua paleta própria. Ícones herdam a cor do texto.
- **PIN em popup:** acessar **Anfitrião** leva a `/host` e abre o diálogo quando necessário. Ele permite fechar, Escape/Back, foco contido e D-pad. O player dedicado não exibe PIN nem controles administrativos.

### Um anfitrião por vez

`QROKE_ADMIN_LEASE_SECONDS=120` define **2 minutos de controle exclusivo**, contados do login. Aceita de 30 a 3600 segundos; configuração inválida usa 120. Altere no `.env` da worktree e reinicie o servidor. A configuração afeta as próximas sessões; o prazo da sessão vigente permanece no banco.

A interface mostra um contador. Durante a reserva, outro navegador recebe aviso e aguarda: a API responde 409 a um PIN válido que dispute o controle. Não há transferência forçada nem fila automática de solicitações. Ao expirar ou clicar **Sair do admin**, qualquer anfitrião pode entrar novamente com o PIN. Atividade, consultas de estado, `touch` e novo login do mesmo proprietário **não prolongam** o prazo.

A exclusividade é garantida no SQLite por transação imediata e índice único, não apenas pelo botão desabilitado. Duas requisições simultâneas resultam em um vencedor; o outro não recebe credencial administrativa. Sessões antigas/expiradas perdem acesso à API, mas o PLAYER continua autorizado pela credencial independente do aparelho. A expiração não abre o PIN automaticamente e não interrompe a música; acesse Anfitrião quando quiser administrar novamente.

Abas do mesmo navegador/origem compartilham o cookie e são a mesma sessão administrativa. `localhost` e o IP da LAN são origens diferentes: prefira uma URL consistente ou saia da sessão anterior antes de trocar.

A migração administrativa foi introduzida no schema **2**; a versão atual é **6** (presença, votos positivos/negativos, recusas de vídeo e metadados dos aparelhos). A migração adiciona o prazo e a unicidade e revoga as sessões administrativas do modelo antigo, preservando convidados, fila, histórico, dispositivos e quota. Após atualizar, informe o PIN novamente. O prazo de uma sessão nova sobrevive ao reinício do servidor.

### Recuperação no fim de áudio local

Cada faixa local usa seu próprio elemento de áudio. Ao trocar de faixa ou sair do PLAYER, o elemento anterior é pausado e sua fonte liberada; eventos residuais mantêm o identificador anterior. A expiração do admin e a rolagem continuam preservando a reprodução da faixa atual.

Além do evento nativo `ended`, o PLAYER verifica se o áudio está no último centésimo de segundo, sem seek, com reprodução elegível, por pelo menos dois segundos. Se o navegador omitir o evento, envia o término com o identificador da faixa. O servidor continua ignorando eventos atrasados/duplicados. Essa recuperação não se aplica ao YouTube e não avança áudio pausado pelo anfitrião.

### Playlists do YouTube para todos os participantes

Em `/busca`, entre pelo nome e abra **Playlists do YouTube**, abaixo da busca. Não precisa do PIN. Links públicos/não listados não exigem conta Google; **Minha conta** pede autorização de leitura das playlists pessoais. O anfitrião também encontra o componente em `/host`.

- **Colar link**: aceita URL de playlist do YouTube ou YouTube Music (parâmetro `list=`), ou seu ID. Usa `YOUTUBE_API_KEY` no servidor para ler listas públicas/não listadas, suas ou de outros canais.
- **Minha conta**: autorize o Google em um popup para listar as playlists **criadas pela conta selecionada**, inclusive privadas. Estar logado no player não autoriza a API; playlists apenas salvas de outros canais podem ser importadas pelo link.
- **Conferir → Adicionar músicas**: mostra as faixas e os itens ignorados antes de inserir. Se o PLAYER já estiver ativado e livre, começa a tocar. Não substitui a música atual. O rodízio continua: cada faixa recebe a identidade do participante e o rótulo da playlist. O resumo **Playlist · nome** agrupa suas faixas e mostra as posições atuais; as faixas individuais continuam intercaladas no rodízio, sujeitas aos votos e à ordem manual. Se o admin ainda não entrou pelo nome, aparece como “Anfitrião”. Importações antigas não possuem metadados de origem e não recebem um nome inventado.
- A prévia lê até **200 itens por lote**, seguindo páginas de 50. Para uma lista maior, adicione o lote e use **Próximo lote**. A listagem da conta também tem **Mais playlists**. A fila aceita até 2.000 itens por esse fluxo.
- Vídeos privados, removidos, ainda não processados, estreias futuras e vídeos sem incorporação são ignorados. Uma playlist privada pode conter vídeos públicos reproduzíveis. Itens repetidos e faixas já na fila/tocando não são duplicados. Restrições regionais/etárias ainda podem ser impostas pelo player.
- A opção **Estas faixas são de karaokê** ativa o layout correspondente; não remove a voz do vídeo. Mixes automáticos, Assistir mais tarde e outras listas especiais podem não ser disponibilizados pela API.

Para conectar sua conta no ambiente local atual:

1. No mesmo projeto Google Cloud, habilite **YouTube Data API v3**.
2. Configure a tela de consentimento no Google Auth Platform. Se o app estiver em teste, adicione sua conta em **Público-alvo → Usuários de teste**. Inclua o escopo de leitura `https://www.googleapis.com/auth/youtube.readonly`.
3. Crie **Credenciais → ID do cliente OAuth → Aplicativo da Web**. Registre exatamente `http://localhost:3100/api/youtube/callback` como URI de redirecionamento autorizado.
4. Salve `YOUTUBE_CLIENT_ID` e `YOUTUBE_CLIENT_SECRET` no `.env` privado da worktree. Configure `YOUTUBE_REDIRECT_URI=http://localhost:3100/api/youtube/callback` e reinicie o servidor. A API key continua em uma variável separada.
5. No computador que executa o QRokê, abra `http://localhost:3100/host`, libere o PIN e escolha **Minha conta → Conectar YouTube**. Permita o popup, escolha a conta/canal e autorize a leitura. O player permanece na página original.

HTTP em localhost é permitido pelo Google para desenvolvimento; um IP LAN bruto como `http://192.168.31.95` não é um callback OAuth válido. Para conectar diretamente pelo celular será necessário hospedar o app em um domínio HTTPS e registrar o callback desse domínio. A conexão fica no navegador e na origem usados, portanto conectar em localhost não conecta automaticamente uma aba aberta pelo IP LAN.

Tokens de acesso/renovação ficam **somente na memória do servidor**, por até 8 horas, vinculados a um cookie HttpOnly do navegador e ao ator que iniciou a autorização (participante ou sessão administrativa). Não são enviados ao JavaScript, banco ou Git. Reiniciar o servidor exige reconectar o Google; a fila já importada permanece no SQLite. **Desconectar** remove o acesso local e as prévias privadas, preservando as faixas já adicionadas. Para revogar a autorização no Google também, remova o acesso em [Conexões da Conta Google](https://myaccount.google.com/connections).

A autorização usa state descartável, cookie temporário SameSite Lax e PKCE. O retorno do Google **não libera nem renova o admin**. Participantes identificados usam somente a própria conexão; identidade, propriedade e validade da conta são conferidas novamente após leituras remotas. Sem nome de participante, o fluxo administrativo ainda exige sua lease ativa; entrar pelo nome é recomendado para não depender dela. Outro participante/admin não pode listar nem desconectar essa conta, mesmo apresentando um cookie OAuth de outro ator. Prévias valem por 5 minutos, pertencem a quem as criou e só podem ser consumidas uma vez. Ao mudar a identidade administrativa ou passar de admin anônimo para participante, conecte novamente. As contas não são compartilhadas entre navegadores.

Conectar, listar e conferir playlists compartilham um limite de 12 consultas/minuto por ator e 30/minuto por IP. São limites de proteção local, não uma garantia de capacidade comercial. As chamadas de playlists usam a quota do projeto Google separadamente do limite local de buscas de emergência. Não precisam fazer uma pesquisa por música. Não há gravação, alteração ou exclusão de playlists na conta Google.

Referências oficiais: [playlists da conta com mine=true](https://developers.google.com/youtube/v3/docs/playlists/list), [paginação dos itens](https://developers.google.com/youtube/v3/docs/playlistItems/list) e [OAuth para aplicativos Web](https://developers.google.com/identity/protocols/oauth2/web-server).

#### Google bloqueou o login: aplicativo não concluiu a verificação

Se o Google mostrar **“Acesso bloqueado: o app … não concluiu o processo de verificação”**, confira o projeto correspondente ao `YOUTUBE_CLIENT_ID`. O nome apresentado (por exemplo, “geolocalizador”) vem da configuração de consentimento desse aplicativo OAuth; não é o título da página do QRokê.

Para um app de desenvolvimento com publicação **Em teste**:

1. Abra [Google Auth Platform → Público-alvo](https://console.cloud.google.com/auth/audience) no projeto que criou o Client ID.
2. Em **Usuários de teste → Adicionar usuários**, inclua o e-mail exato da conta escolhida no login do YouTube e salve. Ser proprietário do projeto não substitui a inclusão nessa lista.
3. Confira em **Acesso a dados** o escopo `https://www.googleapis.com/auth/youtube.readonly`.
4. Feche a janela bloqueada e use novamente **Minha conta → Conectar YouTube** no QRokê. Se o controle de anfitrião tiver expirado, libere o PIN.

Não é necessário publicar o app para usar esse fluxo de desenvolvimento com usuários de teste. Se o Client ID pertence a outro aplicativo/projeto, configure um cliente no projeto destinado ao QRokê, com o callback correto, atualize o `.env` da worktree e reinicie o servidor. Não altere a publicação de outro app já utilizado em produção apenas para resolver este teste.

Se a conta já está na lista e continua bloqueada, confira o código/detalhes exibidos pelo Google e se a conta escolhida é a mesma adicionada. Restrições de uma organização Google Workspace ou Proteção Avançada também podem impedir o acesso. A aplicação não consegue remover esse bloqueio pela API.

Referências: [público-alvo, publicação e usuários de teste](https://support.google.com/cloud/answer/15549945?hl=pt-BR) e [quando a verificação não é necessária](https://support.google.com/cloud/answer/13464323?hl=pt-BR).

### QR com verificação e atualização do endereço

Enquanto uma tela com QR estiver aberta, ela verifica o endereço a cada **30 segundos**, ao recuperar a conexão e ao voltar para a aba. Todos os QR, inclusive o da TV/karaokê, oferecem **Verificar acesso** e **Copiar link da festa** quando existe endereço válido. O servidor reutiliza o resultado por até 15 segundos e confere uma identificação própria em `/api/network/probe`; uma página qualquer respondendo HTTP 200 não é suficiente.

O monitor relê apenas `QROKE_PUBLIC_URL` do `.env` da worktree, sem reiniciar o player. Se o endereço mudar, a URL e a imagem do QR são regeneradas. Se o IP privado configurado parar de responder, o servidor procura os IPs privados atuais da máquina e só troca para um deles quando alcançar **esta mesma instância do QRokê**. No WSL, consulta as interfaces privadas do Windows via PowerShell; no Linux nativo, usa as interfaces locais. Um domínio/HTTPS configurado não é substituído por IP local.

Se o IP mudar e a nova porta ainda não estiver encaminhada, a tela avisa. Ela não anuncia o novo endereço como funcional nem modifica firewall/roteador. O QR e o link são ocultados se o endereço for considerado indisponível ou o navegador perder contato com o servidor; voltam a ser gerados após uma checagem bem-sucedida. O QR inicial aguarda a verificação para não anunciar um endereço antigo; um celular aberto no endereço antigo precisa escanear o novo QR. Também não é possível detectar cada falha de leitura de câmera ou verificar o Wi-Fi de todos os celulares; o probe confirma acesso do servidor pela URL anunciada, não substitui o teste físico no celular.

Reiniciar o roteador pode mudar o IP atribuído por DHCP. Reserve o IP do computador no roteador para reduzir esse risco. Reiniciar o WSL também pode mudar seu IP interno, exigindo reaplicar `scripts/wsl-lan.ps1` com o IP privado atual do Windows. Uma simples regeneração da imagem não corrige porta bloqueada, Wi-Fi desconectado ou isolamento entre clientes.

`QROKE_INVITE_ENV_FILE` é opcional (padrão `.env`): define qual arquivo fornece a URL pública para releitura. Para executar o servidor compilado diretamente, use `NUXT_INVITE_ENV_FILE`; valor vazio desliga a releitura e mantém `NUXT_PUBLIC_PARTY_URL`. A descoberta de IP é somente leitura e só ocorre quando a URL privada falha; no WSL requer interoperabilidade com PowerShell.

## Navegação, ativação de som e aparelhos — atualização de 28/09/2026

As três páginas principais são **`/busca`**, **`/host`** e **`/player`**. A raiz `/` redireciona para `/busca`, preservando parâmetros e âncora; convites antigos continuam válidos. `/tv` e `/qr` continuam redirecionando para `/player`.

- **Busca:** entrada por nome, pesquisa de músicas, karaokê, playlists, participantes e pedidos/votos. O botão da fila vazia leva a `/busca#busca` e foca o campo apropriado.
- **Anfitrião:** acesso pelo menu **Anfitrião** abre `/host` com o PIN quando não há sessão válida. Após autenticar, os controles administrativos ficam disponíveis nessa página. Expiração, revogação detectada ou **Sair do admin** redirecionam o host para `/busca`; voltar ao host exige autenticar novamente. O prazo continua configurado por `QROKE_ADMIN_LEASE_SECONDS` (padrão 120 s). A detecção na interface acompanha a atualização da sessão, normalmente em até 2 s; a API recusa imediatamente uma sessão expirada.
- **Player:** mantém somente o menu **Anfitrião**, tema e o botão compacto **Ativar som → Som ativo**, com **Nesta tela** dentro dele, no cabeçalho fixo. Não mostra Liberar controles, PIN, Sair do admin, configurações, comandos de pulo/retry ou edição/votos na fila, mesmo se o navegador tiver uma sessão administrativa. O link Anfitrião leva à página de administração. A fila mantém cartões de playlist, nomes e contagens de votos para exibição. Teclas de mídia dessa tela não enviam comandos administrativos; setas navegam e Escape/Back devolvem o foco à ativação de som.

**Ativar som** concede a permissão local do navegador, sem assumir o papel de PLAYER nem liberar administração. Pode ser acionado antes de o anfitrião escolher esse aparelho. O botão permanece no mesmo lugar quando a fila está vazia, muda de faixa/modo ou a página rola. O texto dentro do próprio botão distingue autorização local e aparelho escolhido. Se outro aparelho foi selecionado, esta tela aguarda; a escolha continua em `/host`. O player dedicado não sai de `/player` quando a sessão de admin expira.

No modo Música com **YouTube**, o iframe continua compacto e visível; o modo organiza a apresentação, sem extrair ou ocultar o vídeo durante a reprodução. As [políticas do YouTube](https://developers.google.com/youtube/terms/developer-policies#i.-additional-prohibitions) vedam separar o áudio e reproduzir por player invisível, e a [documentação do player](https://developers.google.com/youtube/player_parameters) estabelece área mínima de 200 × 200 px. Áudio da biblioteca local não precisa de iframe. O QR continua disponível.

### Identificar as telas conectadas

Em **Anfitrião → Onde o som toca**, cada aba mostra:

- Nome personalizável, online/offline, marcação PLAYER e indicação deste aparelho.
- Tipo (celular, tablet, computador ou TV), sistema e versão disponível.
- Modelo informado pelo navegador, nome/versão do navegador e versão do QRokê.
- Abertura no navegador ou como aplicativo instalado, tela atual (Busca/Player/Anfitrião) e seis caracteres do ID para distinguir abas parecidas.

Novos cadastros usam descrições como `SM-S921B · Chrome` ou `Computador Windows · Edge`. Nomes já salvos ou renomeados são preservados. Metadados são atualizados no registro/heartbeat e a tela atual acompanha a navegação, sem criar um novo aparelho. Abas continuam independentes; o ID não é um número de série físico.

A identificação usa User-Agent e, quando disponível, [User-Agent Client Hints](https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData/getHighEntropyValues). No HTTP por IP local, Safari, navegadores embutidos ou configurações de privacidade, modelo/versão podem não ser disponibilizados. O app não inventa um modelo a partir do marcador Android `K`, nem afirma Windows 10/11 apenas pelo User-Agent reduzido. Não acessa hostname, número de série ou o nome Bluetooth da caixa. Renomear é a forma confiável de distinguir aparelhos idênticos. A indicação de aplicativo instalado descreve o modo de abertura; esta mudança não instala nem implementa uma PWA.

**Dados:** schema SQLite **6**, coluna `devices.info`; migração preserva IDs, tokens, nomes e estado da festa. `POST /api/device` e `POST /api/device/heartbeat` aceitam metadados opcionais validados, mantendo compatibilidade com clientes antigos. O heartbeat exige a credencial privada do próprio aparelho. Os detalhes técnicos só são retornados por `GET /api/devices`, com sessão admin; `/api/state` mantém apenas identificação pública/atividade. O User-Agent completo não é armazenado. Dados declarados pelo cliente servem para apresentação, nunca para autorização.

**Correção encontrada nos testes:** a atualização periódica da festa podia repor o valor antigo enquanto o anfitrião editava o tempo de karaokê. O formulário agora observa mudanças efetivas das configurações; a edição resiste ao polling. O foco da busca também deixa de ser reposicionado a cada atualização da presença.

**Infraestrutura:** foi localizado e lido o README de `/home/rpolan/projects/nwx/nwx_infra`, que descreve Docker Swarm, proxy Nginx e deploy SSH/GitHub Actions para homologação/produção. A consulta foi somente de leitura; não confirmou sessão SSH ativa nem alterou/publicou nada na VPS. Acesso externo do QRokê continua em planejamento.

## Player, votos, playlists e karaokê — atualização de 28/09/2026

A rota principal de reprodução agora é **`/player`**. `/tv` e `/qr` redirecionam para ela. Atualize as abas já abertas com **Ctrl+F5** depois desta atualização; no aparelho que emite o som, pressione **Ativar som** se o navegador solicitar. O código continua na worktree `qroke-v1`, branch `codex/qroke-v1`, sem push ou PR.

### Tela e controles

- **Música/áudio local ou festa vazia:** convite QR à esquerda e fila à direita no desktop; no celular, os blocos se empilham. O iframe YouTube permanece visível quando usado no modo Música.
- **Vídeo:** reprodução em destaque e fila/convite ao lado. **Karaokê:** área ampliada e QR sempre disponível em um canto reservado, sem cobrir o vídeo. Os modos usam a mesma instância do player; a troca de modo não recarrega a faixa.
- Cabeçalho com botão **Anfitrião** e ícone. **Sair do admin** fica no topo do anfitrião. O player contém apenas o link Anfitrião, sem comandos administrativos. Controles separados em reprodução, volume, modo da tela, fila/continuação e karaokê; removido o comando duplicado de remover/pular a atual.
- Fila vazia mostra **Buscar músicas**, com destino `/busca#busca` e foco no campo de busca ou nome. Elementos se adaptam a 320/360 px, tablet e desktop; controle remoto também navega pelos novos campos e expansores.

### Pular, falhas e músicas indisponíveis

**Pular** e **Tentar novamente** enviam o `queueId` da faixa exibida. Um comando repetido ou atrasado só pode afetar esse pedido; não pula a faixa que entrou depois. Eventos antigos do iframe também são ignorados. Tentar novamente gera outro identificador para impedir que uma falha atrasada encerre a tentativa nova.

Uma recusa de conteúdo (2/100/101/150) pode avançar uma faixa. Uma segunda falha consecutiva pausa na faixa problemática e preserva o restante da fila. Erro de navegador (5), identificação do site (153), arquivo local ou erro desconhecido pausa imediatamente. O aviso informa a causa, oferece tentativa/pulo ao anfitrião e link para o vídeo no YouTube. Autoplay bloqueado solicita ativação, sem consumir a fila. Cinco segundos de reprodução bem-sucedida, término normal ou ação explícita reiniciam a contagem de falhas.

O catálogo combina gravações e vídeos, deduplica IDs e usa metadados oficiais para filtrar incorporação, privacidade, processamento, idade e restrições de país. Configure **`QROKE_YOUTUBE_REGION=BR`** (padrão Brasil, código ISO de duas letras) conforme o país do PLAYER; a reserva oficial usa a mesma região. A API nem sempre antecipa a recusa do iframe.

Recusas confirmadas 100/101/150 ficam ocultas por **24 horas**, persistidas em SQLite: buscas novas e em cache, seleção antiga, recomendações e playlists consultam esse registro. A importação verifica novamente os vídeos após a prévia. Erros genéricos de navegador/referenciador não entram nesse filtro. O bloqueio é por versão/ID, não por artista. Após expirar, a versão pode ser avaliada novamente. A fila já existente não é apagada por uma filtragem de catálogo.

**Diagnóstico do Ramones:** as versões `bQWlgrYKfdk` (Swallow My Pride), `TP6PV5OjaeE` (Garden of Serenity) e `zfrEqSA4wz8` (I Don't Care) retornaram erro 150 no iframe oficial em teste isolado. A Data API informava incorporação permitida e Brasil entre os países permitidos. Portanto, não foi comprovado um bloqueio territorial do Brasil; foi observada recusa de incorporação dessas versões. Um vídeo de controle oficial reproduziu no mesmo ambiente. Somente esses três IDs verificados foram registrados no filtro da festa atual, sem modificar sua fila/histórico. Não há contorno de restrições, proxy de vídeo, extração ou substituição automática da escolha. Alternativas são outra versão disponível na busca ou um arquivo próprio na biblioteca local.

Referências: [erros e controles da IFrame API](https://developers.google.com/youtube/iframe_api_reference) e [restrições do recurso videos](https://developers.google.com/youtube/v3/docs/videos).

### Volume, aparelhos, Chrome e PWA

O anfitrião controla **0–100% e silêncio** do PLAYER selecionado, de qualquer aparelho conectado à festa. O valor é persistido, acompanha a troca de música e é reaplicado quando o iframe/áudio fica pronto. O painel distingue o valor solicitado da confirmação enviada pelo PLAYER. Se não confirmar, verifique a conexão e atualize a aba que toca; não é necessário instalar PWA.

Teste isolado com o iframe real e o aplicativo verificou o elemento de vídeo em **37%, 0% silenciado e 82%**, sem interromper a reprodução. O responsável confirmou depois que o volume passou a funcionar no computador conectado à caixa. O volume do sistema/caixa continua independente; navegadores móveis podem limitar volume programático.

| Operação                                                            | Disponível agora / limite                                                                                                                                                   |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adicionar aparelho                                                  | Abrir o endereço da festa no Chrome, entrar em Player, escolher no anfitrião e ativar som nesse aparelho                                                                    |
| Selecionar PLAYER                                                   | Um aparelho por vez; troca espera até 9 s para o anterior parar                                                                                                             |
| Renomear / remover                                                  | Painel lista online/offline; remover revoga a credencial e para o PLAYER sem descartar a faixa/fila. Reabrir a página registra um novo aparelho; não é banimento permanente |
| Caixa Bluetooth                                                     | Parear e escolher a saída nas configurações do computador/celular/TV que reproduz                                                                                           |
| Saída de áudio local                                                | `setSinkId`, quando suportado, autorizado e em contexto seguro; escolha é lembrada nessa aba. YouTube usa a saída do sistema                                                |
| Chrome / PWA                                                        | Controles atuais funcionam no Chrome. Instalação PWA/HTTPS ainda é proposta; não concede controle nativo de Bluetooth nem desbloqueia áudio automaticamente                 |
| Transmitir para Chromecast / tocar sincronizado em vários aparelhos | Não implementado; não confundir seleção de PLAYER com Cast ou reprodução multiroom                                                                                          |

[API de volume do YouTube](https://developers.google.com/youtube/iframe_api_reference), [volume HTMLMediaElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume), [Web Bluetooth do Chrome](https://developer.chrome.com/docs/capabilities/bluetooth) e [instalação de PWA](https://web.dev/learn/pwa/installation).

### Like e dislike

Cada participante tem uma reação por pedido: **👍 +1** ou **👎 −1**. Clicar novamente no mesmo gesto remove o voto; clicar no outro troca a reação. A interface mostra as duas contagens e o saldo, que ordena a fila antes dos critérios de rodízio. É possível dar dislike na próxima faixa para fazê-la descer; um novo like na que já é a próxima permanece desabilitado.

A ordem manual do anfitrião prevalece. Enquanto ativa, não entram novas reações/trocas, mas o participante pode retirar a sua. Reações são transacionais, únicas por pessoa/pedido e persistem após restart; saem com a música. Isso não é votação para pular a música em reprodução.

### Playlists na própria lista e no PLAYER

A lista de playlists pessoais possui **expandir/recolher** e **playlist +** para adicionar o lote completo. A expansão mostra as faixas no mesmo item da lista; cada faixa tem botão próprio de inclusão e indicação de posição/Tocando agora. Por link público, a prévia oferece as mesmas ações. Playlists grandes continuam em lotes de até 200 itens, com Próximo lote.

Uma faixa escolhida individualmente entra **avulsa**. Adicionar todas inclui apenas as que faltam, com rótulo da playlist; uma faixa avulsa já existente não é transformada nem duplicada. No `/player`, faixas de uma playlist aparecem em um **card expansível**, com nome, solicitante, total pendente e indicação da atual. Faixas avulsas mantêm seu formato. As posições individuais dentro do card continuam refletindo a ordem global — votos e rodízio podem intercalar playlists.

A proteção usa o ID do vídeo em toda a fila e na faixa atual, inclusive entre usuários/playlists diferentes. Repetir Adicionar todas não duplica conteúdo. Prévia e seleção individual permanecem vinculadas ao participante/conta; o servidor não aceita IDs arbitrários nem ticket de outra pessoa. A prévia dura cinco minutos. Inclusão individual mantém a prévia válida para outras escolhas; inclusão completa consome o ticket.

### Preparação do karaokê e participantes

Antes de cada novo karaokê, a tela destaca **contagem, título e quem vai cantar**. Padrão **5 s**; o anfitrião configura de **0 a 30 s** (0 desliga) e liga/desliga a vinheta em Karaokê. O tempo salvo vale para as próximas faixas e persiste após reiniciar.

O relógio só começa depois que o PLAYER estiver preparado e com som ativado. O servidor confirma o instante, compartilhado com as telas; eventos de término/erro/progresso durante a preparação não consomem a fila. Pausar congela o restante da preparação; continuar inicia esse restante. Pular invalida a preparação anterior. Troca de aparelho mantém a janela de segurança. Faixa comum não recebe essa espera.

A vinheta é uma sequência instrumental original sintetizada com Web Audio, sem arquivos externos nem áudio extraído do YouTube. Toca apenas no PLAYER autorizado durante a contagem, acompanha o volume/silêncio e para ao começar a música, pausar ou perder autorização/conexão. Se Web Audio não estiver disponível/autorizado, a contagem visual continua; mantenha o PLAYER visível e ativado.

Na busca em Karaokê e na importação de playlist marcada como Karaokê, **Quem vai cantar?** permite selecionar vários participantes presentes (até 50 parceiros por pedido). Quem faz o pedido já está incluído quando entrou pelo nome. São aceitos apenas IDs de participantes existentes e presentes, com nomes obtidos pelo servidor; sair depois não apaga os nomes já anunciados. Editar o nome atualiza também a participação nas músicas. Os cantores aparecem na fila e na preparação. Marcar karaokê não remove a voz de um vídeo comum.

### Dados, compatibilidade e aceite

Schema **4** adicionou `youtube_blocks`; schema atual **5** acrescenta `queue_votes.value`. Votos antigos viram +1. Migrações preservam convidados, fila, histórico, contas de dispositivo e leases válidas. Os novos campos de volume, erro e karaokê são opcionais para compatibilidade com snapshots antigos. A aplicação continua com uma festa, um processo Node e SQLite.

Novos contratos: `GET /api/devices` (admin); comandos `volume`, `rename-device`, `remove-device`, `retry`, `karaoke-settings`; `skip/retry` exigem `queueId`. `/api/player` aceita `ready`, código de erro e confirmação de volume, sempre com a credencial do PLAYER. Votos recebem `value: -1|0|1`; `voted: boolean` continua aceito para clientes antigos. Importação aceita `videoId` opcional e participantes; sem `videoId`, importa o lote.

Antes de aprovar PR, testar fisicamente: dois controladores pulando a mesma faixa, volume pelo celular no computador com caixa, transferência entre aparelhos, likes/dislikes e desfazer, playlist completa versus avulsa, cinco karaokês com parceiros diferentes, tempo 0/5/10 s e vinheta, pausa durante a contagem, QR em TV/celular e reprodução longa. Acesso externo, domínio HTTPS, PWA instalável e planos comerciais permanecem no plano, sem implantação nesta entrega.

## Ajustes para participantes — 28/09/2026

- **Música anterior:** no admin, volta ao início da última faixa tocada/pulada (erros são ignorados). A faixa interrompida retorna à fila com novo identificador e prioridade manual entre os pedidos humanos. Eventos atrasados da reprodução anterior são ignorados. Se a anterior também tiver sido pedida novamente, a cópia pendente é removida porque já vai tocar. O botão fica indisponível sem histórico; use **Liberar rodízio e votos** para remover a prioridade manual.
- **Nome em destaque e editável:** o cartão **Você na festa → Editar nome** altera a identidade do navegador, refletindo nos pedidos, na faixa atual e no histórico. Nomes repetidos recebem sufixo; continuam valendo 2–20 caracteres Unicode.
- **Quem está na festa:** participantes que entraram pelo nome e contataram o servidor nos últimos 90 segundos. Presença é atualizada pela sessão a cada 2 segundos e expira automaticamente; fechar a aba não apaga identidade/pedidos. Não é uma lista de contas Google, nem comprovação de pessoa única: outro navegador/cookie gera outra entrada.
- **Votos:** cada participante tem um voto por faixa pendente, com opção de retirar. Uma faixa pode subir até o primeiro lugar; quem ainda não votou não vota na que já é a próxima. Quem a promoveu pode retirar seu voto. A faixa tocando e músicas automáticas não recebem votos. Empates mantêm o rodízio. Ordem manual do admin bloqueia novos votos; retiradas continuam possíveis. Votos persistem após restart e são eliminados quando a faixa sai da fila.
- **Playlists:** abertas aos participantes identificados em `/`, com autoria e nome da playlist no resumo agrupado, nos cartões, na fila e na legenda do player. Adições por busca e por playlist impedem repetição de faixas pendentes/tocando. Importar uma lista não interrompe a atual.
- **Comunidade e YouTube:** use **Colar link** para playlists de outros usuários/canais e listas publicadas pelo YouTube que a Data API disponibilize. A API não oferece todo Mix personalizado, Assistir mais tarde ou toda coleção editorial visível no site. Não há promessa de importar listas inacessíveis/privadas de outra conta. [Consulta oficial de playlists](https://developers.google.com/youtube/v3/docs/playlists/list).
- **QR em todas as telas:** só anuncia endereço após a verificação, oferece link copiável e nova checagem; retira o QR/link inválidos enquanto a rede falha e os recria quando o acesso volta.

### Celular, Google e diagnóstico da rede

Em 28/09/2026, o processo da porta 3100 estava desligado; foi reiniciado. O acesso pela URL LAN `http://192.168.31.95:3100/` respondeu HTTP 200 no Windows e o monitor confirmou a mesma instância no WSL. Nenhuma nova regra de firewall, abertura de roteador ou publicação externa foi aplicada.

O callback OAuth atual é `http://localhost:3100/api/youtube/callback`. No celular, localhost aponta para o próprio telefone. O Google exige HTTPS para callbacks Web fora de loopback e não aceita o IP LAN bruto como alternativa. Por isso, o painel agora explica a limitação e não oferece um link localhost ao celular. A conexão móvel completa depende do domínio HTTPS do plano abaixo; **essa infraestrutura ainda não foi implementada**. Conectar pelo localhost do computador funciona apenas nessa origem/navegador. [Regras de redirecionamento OAuth](https://developers.google.com/identity/protocols/oauth2/web-server#uri-validation).

Se um aparelho não acessa o IP:

1. Confira `npm start` na worktree e teste `http://localhost:3100/api/state` no computador.
2. Teste `http://192.168.31.95:3100/api/state` no Windows. Se falhar, confira IP atual, perfil Privado e encaminhamento WSL com o script documentado.
3. No aparelho, use explicitamente **http://** e a porta **3100**. Confira a mesma rede local, isolamento de clientes/rede de convidados, VPN e eventual tentativa automática de HTTPS.
4. Se o PC acessa e somente alguns aparelhos falham, isso ainda exige diagnóstico nesses aparelhos/roteador. O monitor do servidor não prova conectividade de todos os celulares.
5. Após reiniciar modem/WSL, confira IPs e refaça somente o encaminhamento necessário. Reservar DHCP reduz alterações; regenerar a imagem do QR sozinho não abre a porta.
6. Após desligar o computador, o app precisa ser iniciado novamente. Inicialização automática como serviço é uma etapa operacional futura, não foi instalada nesta entrega.

### Dados e APIs adicionados

Schema **3** acrescenta `guests.last_seen` e `queue_votes` (chave única por música/participante), preservando banco, fila e leases válidas do schema 2. O SQLite transaciona a alteração do voto e a reordenação. `QueueItem` aceita `playlist: { id, title }` e `votes`; ambos são compatíveis com registros antigos.

| Rota                       | Comportamento / autorização                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/guest/name`     | Renomear a própria identidade pelo cookie; corpo `{ name }`.                                                                              |
| `POST /api/queue/:id/vote` | Definir o próprio voto de forma idempotente; corpo `{ voted: true/false }`. Retorna 409 se a música/ordem já mudou.                       |
| `GET /api/session`         | Atualiza presença e devolve somente os votos do próprio participante em `votedQueueIds`.                                                  |
| `GET /api/state`           | Lista pública de nomes/IDs presentes e `canGoBack`; sem tokens, e-mails, contas Google ou lista de quem votou.                            |
| `POST /api/control`        | Nova ação `previous`, exclusiva de admin com lease ativa.                                                                                 |
| `/api/youtube/*`           | Participante identificado ou admin ativo; autorização Google só do próprio ator. Callback mantém state/PKCE e não concede papel de admin. |

O nome da playlist, inclusive privada, será visível à festa quando suas músicas forem adicionadas; isso é informado antes de importar. Somente vídeos reproduzíveis são enviados ao PLAYER. A coleção privada da conta não é publicada.

### Aceite adicional desta entrega

- [ ] Em dois celulares: editar nome, conferir presença, votar/retirar e observar posições atualizadas.
- [ ] Confirmar que a busca identifica pedidos de outras pessoas e bloqueia repetição.
- [ ] Importar uma playlist pública como convidado, sem PIN; conferir rótulo, autoria e agrupamento.
- [ ] Conectar contas diferentes em navegadores independentes pela origem OAuth válida; uma não deve listar nem desconectar a outra.
- [ ] No admin, pular e voltar uma música; conferir início em zero e preservação da interrompida.
- [ ] Escanear o QR da TV/karaokê e copiar o link; testar perda/retorno da rede.
- [ ] Revalidar reprodução prolongada no aparelho físico. Testes de navegador não substituem esse aceite.

## Usar na festa

1. Abra `/host`, informe o PIN e mantenha essa aba disponível.
2. Abra `/tv` na TV ou no PC conectado por HDMI. Abra o app também no aparelho que deve produzir som.
3. No aparelho que vai emitir som, entre como anfitrião e clique em **Tocar neste dispositivo**. A ação seleciona o PLAYER e ativa o som em um clique, mesmo com a fila vazia. Na TV, use **Ativar som nesta TV**, informe o PIN e escolha **Tocar neste dispositivo**.
4. Para escolher outro aparelho à distância, use a lista **Onde o som toca** e pressione **Ativar som** nesse outro navegador. Se o navegador bloquear autoplay, o aviso pede o clique local.
5. Mostre `/qr` e peça aos convidados para entrarem pelo mesmo Wi-Fi.
6. Cada pessoa informa o nome, busca e pressiona **+**. Pode adicionar várias músicas. Uma faixa já tocando ou pendente não é duplicada, mesmo quando pedida por outra pessoa. A busca mostra **Tocando agora** ou **Na fila · #posição**.
7. O convidado remove seus próprios pedidos pendentes; o admin remove qualquer pedido, pula a atual e reordena.
8. Para terminar a administração, use **Sair do admin**. O controle também expira ao terminar o prazo fixo configurado (2 minutos por padrão).

### Pedido novo com a fila vazia

O diagnóstico da festa encontrou duas músicas pendentes, `current: null` e `playerId: null`: nenhum aparelho tinha sido escolhido para tocar. Agora as telas de convidado, anfitrião e TV informam quando falta ativar um PLAYER. O botão **Tocar neste dispositivo** também ativa o som, evitando uma segunda etapa oculta.

Depois da ativação, a primeira música sai da fila para reprodução imediatamente; quando a fila termina, o PLAYER permanece pronto e o próximo pedido inicia sozinho. A ativação permanece ao navegar entre rotas na mesma aba. Recarregar a página ou abrir outra aba pode exigir um novo clique por causa das regras de autoplay. Não é necessário ligar **Rádio** para tocar pedidos: Rádio apenas escolhe músicas quando não há pedidos humanos.

Os testes verificam seleção em um clique e consumo da fila. Uma sessão isolada adicional verifica um pedido remoto chegando à fila inicialmente vazia e outro depois da navegação do host para `/qr`: os dois começam, avançam o relógio e terminam sem novo clique em Ativar som. Isolar esse cenário evita o acúmulo da limitação de áudio do Chromium headless descrita abaixo.

### Um PLAYER por vez

Qualquer uma das quatro telas pode receber o papel. Em `/qr`, o player só aparece quando aquela aba é escolhida; normalmente a tela permanece dedicada ao convite.

Cada aba recebe identificação e credencial privada em `sessionStorage`. O host escolhe o identificador público; eventos de reprodução exigem a credencial privada correspondente. Abrir outra aba cria outro candidato a PLAYER. Um handshake via BroadcastChannel detecta cópias de sessionStorage em abas duplicadas e emite outra credencial. Em navegadores sem BroadcastChannel, cada recarga registra um novo dispositivo e requer selecioná-lo novamente no host.

A transferência entre aparelhos introduz uma janela de **9 segundos** antes de o novo tocar. O anterior para ao receber o novo estado ou ao ficar **8 segundos** sem contato com o servidor. Eventos atrasados de faixas antigas são ignorados. No YouTube, rolar a página mantém a reprodução em um player flutuante visível; uma aba oculta ainda pausa o vídeo. Mantenha o aparelho PLAYER em primeiro plano. Áudio local pode continuar enquanto você navega pelos controles ou alterna abas.

A faixa e a posição sobrevivem a restart. Após recarregar a página, pode ser necessário pressionar **Ativar som** novamente. Se o aparelho desaparecer, escolha outro no host; o app não transfere automaticamente o som para um convidado.

### YouTube, Premium e modos

A busca usa `ytmusic-api`; o playback usa o **IFrame oficial em `youtube.com`**. Não há download, extração de áudio ou sessão Premium no servidor. A API key da Data API é usada no backend para o catálogo e playlists públicas. O OAuth opcional mantém autorização de leitura no servidor exclusivamente para acessar as playlists da conta; ele não transfere a sessão do player nem o benefício Premium.

- **Vídeo:** player grande, fila ao lado.
- **Música:** player visível com mínimo de 200 × 200 px.
- **Karaokê:** selecionado na busca do convidado, por faixa. Busca vídeos nas grafias `karaoke` e `karaokê`. Na TV, a área de reprodução se expande; nos cinco segundos finais, libera espaço para a fila e as próximas três.
- Controles, PIN e lista ficam fora do retângulo do player. A abertura dos controles reduz a área do vídeo.
- O fundo usa a thumbnail desfocada, sem um segundo player.
- Recusas de conteúdo podem avançar uma faixa; a segunda falha consecutiva pausa e preserva a fila. Erros de navegador, referenciador e áudio local pausam imediatamente. Veja o tratamento detalhado na atualização acima.
- O domínio, `origin` e referenciador são preservados. Não use uma política de referenciador que omita a origem do iframe.

**Premium sem anúncios precisa ser testado no navegador real.** Login, cookies, política do navegador, restrições do conteúdo e comportamento do YouTube afetam o resultado. O uso de `youtube.com` não garante sozinho ausência de anúncios. O teste automatizado não utiliza nem valida sua conta Premium. Se a premissa falhar, a biblioteca local está disponível.

Fontes: [IFrame API](https://developers.google.com/youtube/iframe_api_reference) e [requisitos oficiais do player](https://developers.google.com/youtube/terms/required-minimum-functionality).

### Biblioteca local e Bluetooth

São indexados no início do servidor: **mp3, flac, m4a, ogg e wav**, recursivamente. A compatibilidade de cada codec depende do navegador. Reinicie o processo para atualizar o índice. O nome `Artista - Música.mp3` produz artista e título; ainda não há leitura de tags ID3 nem upload de arquivos.

A API usa identificadores opacos, recusa caminhos arbitrários e links simbólicos, confere o caminho real antes de abrir o arquivo e aceita pedidos de bytes para seek. Arquivos permanecem na pasta configurada; não são copiados para o projeto.

**Escolher saída de áudio** aparece para faixas locais. `setSinkId` exige navegador compatível, contexto seguro e permissões aplicáveis. Em `http://localhost` pode estar disponível; em HTTP por IP da LAN, normalmente é necessário escolher a saída pelo sistema operacional. Para YouTube, escolha a caixa Bluetooth no Windows/TV: o iframe não oferece seleção de dispositivo ao app. Veja [setSinkId no MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId).

### TV e controle remoto

A tela `/tv` usa elementos HTML comuns, sem componentes Quasar no seu fluxo de controles.

| Entrada                                | Ação                                                          |
| -------------------------------------- | ------------------------------------------------------------- |
| Setas                                  | Vizinho espacial mais próximo na direção, com roving tabindex |
| Enter / OK                             | Aciona o botão focado                                         |
| Backspace / Escape / Back 10009 ou 461 | Fecha PIN ou controles e devolve o foco                       |
| MediaPlayPause                         | Pausa/continua com admin liberado                             |
| MediaTrackNext                         | Pula com admin liberado                                       |
| Dígitos 0–9                            | Preenchem o PIN quando o teclado da TV está aberto            |

Teclado numérico 3 × 4, safe area de 5%, foco de alto contraste e suporte a `prefers-reduced-motion`. Setas de reordenação nas extremidades permanecem visíveis e desabilitadas. O PIN é validado no servidor; cinco tentativas por IP a cada minuto. Polling, progresso do player e consultas de sessão **não renovam** a sessão administrativa; interações também não renovam o prazo absoluto.

Temas são independentes por rota e aparelho, com chaves `qroke:theme:<rota>`. Escuro é o padrão. O script no head evita flash claro, e o Quasar acompanha a preferência nas telas que o usam. O QR permanece em placa branca em ambos os temas.

## Análise e decisões da implementação

O ponto de partida era o commit `069010b`, contendo apenas `docs/plano.md`. A única issue encontrada, #1, descrevia toda a v1. Não havia código, testes, README nem instruções `AGENTS.md`.

### Arquitetura

| Camada           | Implementação                                            |
| ---------------- | -------------------------------------------------------- |
| Aplicação        | Nuxt 4.5.2, Vue, TypeScript                              |
| UI de formulário | Quasar via nuxt-quasar-ui 3.1.1                          |
| Servidor         | Nitro 2.13.4, um processo Node                           |
| Persistência     | better-sqlite3 13.0.3, SQLite WAL                        |
| Catálogo         | ytmusic-api 5.3.1, isolado em adaptador                  |
| Realtime         | WebSocket de invalidação + sincronização HTTP a cada 2 s |
| Reprodução       | IFrame YouTube ou áudio local, apenas no PLAYER          |
| Reordenação      | Setas e vue-draggable-plus                               |
| Testes           | Vitest, servidor Nitro real, Chromium/Playwright         |

`shared/types.ts` contém o contrato compartilhado. `server/core` abriga regras, catálogo, biblioteca e banco testáveis sem Nuxt. `server/api` valida entrada e autorização. `app/composables` mantém estado, conexão, tema e navegação espacial. As quatro rotas estão em `app/pages`.

SQLite armazena o estado da festa como um snapshot JSON transacional em `party`, e usa tabelas separadas para convidados, sessões admin, dispositivos, tentativas de PIN e quota. O schema atual é 5; inclui sessão administrativa exclusiva, presença, reações e recusas de vídeo. Essa escolha atende uma festa em um processo; **não é uma arquitetura de múltiplas instâncias**. O histórico pertence à festa e permanece no banco; não há painel de estatísticas, rotação automática ou botão para apagar a festa nesta v1.

### Rodízio e ordem manual

A prioridade é: **humano antes de automático**, depois ordem manual, número de votos (maior primeiro), rodada e instante de inclusão. O rodízio desempata faixas com a mesma votação.

Uma implementação que recalcula as rodadas considerando apenas as faixas pendentes perde a justiça durante o playback: ao tocar Ana 1, Ana 2 pode voltar à rodada zero e passar à frente de Bruno 1. O código considera também as rodadas já servidas e a faixa atual. Assim, consumir a fila preserva `Ana 1 → Bruno 1 → Ana 2 → Bruno 2 → Ana 3`. Um teste cobre essa regressão.

A expressão `manual_order NULLS LAST` do plano, aplicada só ao item arrastado, não permite colocá-lo em qualquer posição entre itens automáticos do rodízio. Por isso, cada reordenação grava uma **permutação completa da fila pendente** com índices manuais. Novos pedidos ficam depois desse bloco, respeitando a camada humana. **Liberar rodízio e votos** limpa todos os índices manuais, preserva os votos e reativa sua ordenação.

Reordenação usa a revisão do estado. Se outra ação alterou a fila durante o arrasto, o servidor retorna 409 e a UI atualiza/reverte. Progresso de playback não altera essa revisão. Não é permitido mover uma automática antes de uma humana.

### Busca e quota

- Normalização de espaços, caixa e Unicode; consultas de 2 a 120 caracteres.
- Cache de busca por cinco minutos, até 256 consultas; catálogo de resultados selecionáveis por uma hora, até 10.000 entradas.
- Consultas idênticas simultâneas compartilham a mesma chamada. Até quatro consultas diferentes simultâneas e 60 buscas/minuto por IP.
- Karaokê combina as duas grafias e remove IDs duplicados.
- Com chave, `videos.list` filtra privacidade, incorporação, país, idade e processamento; obtém duração/metadados. Até 24 resultados por lote, combinando gravações e vídeos.
- Sem chave, busca e fila funcionam, mas a possibilidade de incorporação só é conhecida durante a reprodução.
- Falha do catálogo primário aciona `search.list` oficial se houver chave e saldo, com aviso no host. Sem reserva, retorna erro claro; a biblioteca local permanece utilizável.
- Quota de emergência é debitada **antes** da chamada, inclusive se a API falhar. Persiste após restart e vira à meia-noite de `America/Los_Angeles`.
- A documentação atual do YouTube descreve uma alocação própria de 100 chamadas `search.list`/dia, diferente do orçamento histórico de 100 unidades por busca registrado no plano. O limite configurado continua medindo chamadas de busca; não tenta contabilizar todo o consumo do projeto Google, como validações ou outros aplicativos. O console Google é a fonte definitiva do saldo.
- Metadados enviados pelo navegador não são confiados: só é possível enfileirar um resultado conhecido do servidor ou um arquivo indexado.

O primário não usa a quota da Data API, o que viabiliza a meta de 1.000 buscas/dia do plano sem usar a reserva para todas elas. **Isso não é garantia de disponibilidade nem um teste de carga concluído**: a biblioteca é não oficial. Não há distribuição de chamadas entre múltiplos projetos.

Para configurar a API key: habilite YouTube Data API v3 em um projeto Google Cloud, restrinja a chave à API e ao **IP público de saída do servidor** quando possível, e coloque-a em `YOUTUBE_API_KEY`. IP privado de LAN não é o IP visto pelo Google. Nunca coloque a chave no `runtimeConfig.public`. Consulte a [tabela oficial de quota](https://developers.google.com/youtube/v3/determine_quota_cost).

### Continuação automática

Quando a fila fica vazia e o rádio está ligado: recomendações `getUpNexts(videoId)`, depois busca dos artistas mais frequentes, depois biblioteca local e histórico elegível. A ordenação favorece artistas com maior peso; cada faixa concluída soma 1 e cada skip subtrai 3. É uma escolha determinística pelo peso, não um sorteio.

A seleção exclui faixas tocadas na última hora, já pendentes e faixas puladas ou com erro na festa. A janela está fixada em uma hora nesta v1. A chegada de um pedido humano durante uma consulta assíncrona é conferida novamente antes de inserir uma automática. A atual não é interrompida pela chegada de um pedido; o pedido ganha prioridade entre as pendentes.

Desligar rádio remove automáticas pendentes, preserva a atual e as humanas. Se não houver candidata elegível, a festa espera um pedido, sem repetir uma faixa proibida pelo dedupe.

### Credenciais: API key para o catálogo e OAuth para playlists pessoais

Os campos “Origens JavaScript autorizadas” e “URIs de redirecionamento” pertencem a um cliente OAuth. Eles não configuram a API key usada pelo catálogo. Agora também são usados, separadamente, pela integração opcional de playlists pessoais descrita acima. No Console Google Cloud:

1. Selecione o projeto e habilite **YouTube Data API v3** em APIs e serviços → Biblioteca.
2. Em **Credenciais → Criar credenciais → Chave de API**, crie a chave.
3. Restrinja a API a **YouTube Data API v3**.
4. Para restrição de aplicativo, use **IP público de saída** do servidor. Não use localhost, 127.0.0.1, origem de navegador ou URI de redirecionamento.
5. Salve o valor em `YOUTUBE_API_KEY` no `.env`; não use Client ID, Client Secret, conta de serviço ou JSON OAuth.

Se o IP de saída for dinâmico, será necessário manter a restrição atualizada. A key normalmente começa por `AIza`. O app mostra mensagens distintas para chave inválida, API desabilitada, IP/referenciador recusado e quota esgotada, sem devolver o valor da credencial.

A credencial fornecida no `.env` do checkout original foi copiada para o `.env` ignorado da worktree de implementação. Atualizações futuras precisam ser copiadas novamente para a worktree em uso. Nenhuma credencial é versionada.

Referências: [credenciais do YouTube](https://developers.google.com/youtube/registering_an_application) e [restrições de API keys](https://docs.cloud.google.com/docs/authentication/api-keys).

### Identidade e autorização

O nome é normalizado, sem caracteres de controle, entre 2 e 20 caracteres Unicode. Repetições recebem sufixo `(2)`, `(3)`, ajustado ao comprimento máximo.

O navegador guarda nome e identificador público em `localStorage`; a prova de identidade é **outra credencial aleatória**, em cookie HttpOnly e SameSite Strict. A API não aceita um `guestId` enviado pelo cliente como autenticação. Se o cookie for perdido, é necessário entrar novamente; copiar apenas o identificador público não permite assumir outra pessoa.

PIN nunca é validado no cliente. Sessões admin são exclusivas, revogáveis e expiram por prazo fixo. A API checa origem das mutações, exige JSON, valida esquemas e limita o tamanho declarado do corpo. A identificação do PLAYER também separa ID público de token privado.

HTTP em LAN e PIN compartilhado são o escopo deste projeto. Não publique o servidor diretamente na internet.

## Testar

```bash
npm test
npm run typecheck
npm run build
npm run test:integration
npm run test:browser
npm run format:check
npm run spike:catalog
# Opt-in: usa a chave do .env; busca oficial de reserva e leitura de playlist pública.
npm run test:youtube
```

- **Playlists e QR:** `tests/youtube-playlists.test.ts`, `tests/network-invite.test.ts`, `tests/playlists-integration.mjs` e `scripts/browser-playlists-check.mjs`. O provedor Google falso é injetado somente no processo de teste via preload Node; não existe bypass de OAuth na aplicação de produção.
- **Unitários:** rodízio durante inclusão e consumo, camada automática, ordem manual, nomes, normalização, dedupe, sinal negativo do skip, cache, fallback, quota, sessões, persistência, caminhos e intervalos de bytes.
- **Integração:** processos reais do build de produção com portas/bancos temporários. Cobrem cookies, autorização, WS, concorrência, persistência, reordenação, eventos atrasados, rádio, rate limit, votos negativos, dispositivos, volume, preparação de karaokê e playlists.
- **Navegador:** `scripts/browser-suite.mjs` executa os dez scripts em sequência, continua depois de uma falha e retorna erro se qualquer cenário falhar. Cada script usa servidor/porta e contextos independentes. Capturas ficam em `test-results/`. Cobre as páginas de 320 a 1440 px, pedidos, áudio local, player, controles, D-pad, temas, QR, polling, playlists, participantes, votos, falhas de reprodução e karaokê.
- **Spike real:** consulta o YouTube Music sem credenciais. Requer internet; não valida Premium.
- **YouTube oficial, opt-in:** valida resultados reais e força uma falha do primário para testar uma chamada de reserva. Após a correção da credencial, o teste oficial passou: 20 faixas validadas via videos.list, 20 faixas na reserva e cache confirmado, com uma chamada search.list. A tentativa anterior foi recusada com API_KEY_INVALID antes de chegar à reserva.

O teste `tests/playlists.live.ts` aceita `YOUTUBE_TEST_PLAYLIST_ID` para escolher outra playlist pública. Para executar somente esse teste, sem repetir a pesquisa oficial: `node --env-file-if-exists=.env node_modules/vitest/vitest.mjs run --config vitest.live.config.ts tests/playlists.live.ts`.

A expiração administrativa preserva a instância do PLAYER; o servidor continua aceitando eventos de reprodução pela credencial do dispositivo. O teste simula a expiração sem esperar o prazo real de dois minutos. Na navegação atual, o host redireciona para a busca; a tela dedicada do player continua aberta.

**Saída de áudio nos testes:** no Chromium headless/WSL, a saída nativa travou o relógio de WAVs carregados (aproximadamente 1,4 s de 2 s), sem erro de mídia. O mesmo aconteceu em HTML puro, fora do QRokê: cinco arquivos concluídos e o sexto parado. Os sete WAVs concluíram com a saída virtual do Chromium. Por isso, `browser-check.mjs` e `browser-autostart-check.mjs` usam `--disable-audio-output`: o navegador ainda decodifica arquivos, controla seu relógio e emite eventos; somente a saída ao sistema é virtual. Não há avanço artificial, alteração de `currentTime` ou evento de término forjado para aprovar a fila. [Implementação e finalidade da opção no Chromium](https://chromium.googlesource.com/chromium/src/+/f29eb01290cd36a30177ecf8197f906c01088a0d).

Para diagnosticar a saída nativa no Linux/WSL: `QROKE_TEST_NATIVE_AUDIO=1 node scripts/browser-check.mjs`. Para aumentar os WAVs: `QROKE_TEST_TRACK_SECONDS=8 npm run test:browser`. A aprovação automatizada não mede o som na caixa nem substitui reprodução prolongada em Chrome normal e dispositivos físicos. O volume com YouTube real foi validado separadamente e confirmado pelo responsável.

O teste de navegador usa `QROKE_CHROMIUM` quando informado; por padrão usa o Chromium headless correspondente à versão instalada do Playwright. Evite forçar uma versão antiga do cache. Em outra máquina, execute `npx playwright install chromium --only-shell` antes. Os testes usam dados próprios e removem apenas seus diretórios temporários ao encerrar; não alteram sua festa.

### Validação atual — conferência completa, janela e karaokê, 28/09/2026

- **70 testes unitários, 20 verificações de integração e 10/10 scripts de navegador aprovados.** TypeScript, build de produção, formatação e `git diff --check` aprovados. A execução completa final de navegador inclui a correção da fila móvel.
- Prioridade de karaokê verificada no servidor ao terminar, pular e tratar recusa, preservando votos/rodízio dentro do grupo, pedidos humanos antes da continuação, proteção da ordem manual, retomada de músicas comuns e persistência após restart. O teste de reordenação envia a revisão válida e exige o erro específico de prioridade; pulo repetido não avança outra faixa.
- O player foi conferido em 1440, 1280 e 1024 px com altura limitada à janela, dimensões mínimas do iframe e QR separado. Celulares de 320 e 390 px continuam rolando. Status **Ativar som / Som autorizado / Som ativo** verificado no mesmo botão e sem mudança de posição. A fila laranja permanece visível também em 768 e 320 px.
- Contagem ocupa a janela, reserva espaço para cabeçalho/QR, destaca título e três cantores e respeita movimento reduzido. Capturas inspecionadas: `player-window-video-1280.png`, `countdown-fullscreen-1440-dark.png`, `countdown-fullscreen-320-light.png` e `karaoke-queue-320.png`, dentro de `test-results/`. Testes aguardam a conclusão dos efeitos finitos antes de capturar a preparação estável.
- Regressão cobre busca por Enter, início após fila vazia, continuidade durante scroll, PIN exclusivo/expiração, anterior/pular, volume, aparelhos, playlists pessoais/públicas com provedor de teste, dedupe, cartões sem autoria repetida, reações, participantes, temas, marca e recuperação do QR. Dados temporários não alteram a festa existente.
- Verificação privada: **nenhuma ocorrência** de API key ou credenciais OAuth em **146 arquivos de código/documentação** nem em **30 arquivos públicos** do build.
- Prévia reconstruída e iniciada em `http://localhost:3100`. Pelo Windows, **HTTP 200** nas três páginas `/busca`, `/host` e `/player`, tanto por localhost quanto por `192.168.31.95:3100`. Banco e fila existentes preservados.
- Limites mantidos: os testes desta rodada não repetem login pessoal/API real do Google nem certificam som/TV/celular físico. O iframe dos cenários automatizados é simulado e o áudio local headless usa saída virtual conforme explicado acima. Login Google pelo celular ainda depende do domínio HTTPS planejado; acesso externo/comercialização continuam propostas.
- Todas as alterações permanecem na mesma worktree e branch `codex/qroke-v1`, sem push, PR ou deploy. Atualizar as abas com **Ctrl+F5** para carregar o novo build antes do aceite.

### Validação anterior — identidade visual, 28/09/2026

- **63 testes unitários, 19 verificações de integração e 10/10 scripts de navegador aprovados na execução final.** TypeScript, build e formatação também aprovados.
- `browser-theme-check.mjs` verifica carregamento dos PNGs locais, seleção da versão escura/clara, proporção 3:1, ausência de overflow e separação entre logo, QR e botão de ativar som. Matriz: `/busca`, `/host` e `/player`, nos dois temas, em 320, 390, 768 e 1280 px. A suíte geral também cobre 1440 px e os modos música/vídeo/karaokê.
- Contraste de pelo menos **4,5:1** nas amostras de texto/botões verificadas, incluindo o destaque da busca; movimento reduzido preservado. Capturas `test-results/brand-*.png` e inspeção visual confirmaram marca e espaçamento. O componente usa a versão de letras claras mesmo no tema claro quando o fundo do player permanece escuro.
- Uma execução inicial da suíte falhou na asserção de continuidade durante scroll. O teste passou em três repetições isoladas e na execução completa final; a falha não foi reproduzida. A asserção agora discrimina instância, iframe, reprodução e quantidade de pausas para facilitar diagnóstico se voltar a ocorrer. Nenhuma tolerância foi adicionada.
- Arquivos da marca conferidos contra os downloads originais. Verificação privada: nenhuma ocorrência de API key ou credenciais OAuth em 145 arquivos de código/documentação ou 30 arquivos públicos. Prévia reconstruída e iniciada na porta 3100; nenhuma publicação ou PR.

### Validação da navegação e aparelhos — 28/09/2026

- **63 testes unitários e 19 verificações de integração aprovados.** Novos casos cobrem Android com Client Hints, fallback sem modelo, Edge, Safari/iPhone, Samsung Internet/tablet, TV, migração do schema 5, metadados privados, credencial do heartbeat e preservação do nome após renomear/reiniciar.
- **10/10 scripts de navegador aprovados na execução completa.** Verificados `/` → `/busca`, expiração/logout do host → busca, reentrada com PIN, ausência de administração no player mesmo com cookie admin, setas/Back, botão fixo antes/depois de selecionar o aparelho e ao rolar/mudar de modo, volume e pulo remoto, identificação Android, playlists, temas e QR de 320 a 1440 px. A configuração do karaokê permanece editada durante o polling e o player dedicado continua aberto após sair do admin.
- **TypeScript, build de produção e formatação aprovados.** Inspeção visual da captura do player em 320 px; nenhum overflow nos cenários responsivos monitorados. A verificação privada não encontrou API key/Client ID/Client Secret em 141 arquivos de código/documentação nem em 27 arquivos públicos do build.
- **Smoke Windows/LAN aprovado:** `/busca`, `/host` e `/player` retornam 200 por localhost e `192.168.31.95:3100`; `/` redireciona para busca e os aliases `/tv` e `/qr` para player. A versão atualizada está iniciada na porta 3100.
- Identificação de Android/Client Hints foi simulada no teste de navegador; confirme o modelo mostrado no celular físico. Não houve nova chamada à API real do YouTube nem login Google real nesta rodada. Permanecem os limites de áudio virtual/headless e aceite físico descritos abaixo.
- `nwx_infra` foi somente consultado localmente. Sem SSH, alteração de infraestrutura, push, deploy ou PR. QRokê permanece na mesma worktree e branch `codex/qroke-v1`.

### Validação anterior — player, playlists e karaokê, 28/09/2026

- **58 testes unitários aprovados:** rodízio, catálogo/cache/filtros, playlists, autorização, persistência, migrações, votos, avanço e recuperação de reprodução.
- **18 verificações de integração aprovadas:** build real com dados isolados, chamadas concorrentes, proteção contra pulo repetido, eventos antigos, pausa em cascata de falhas, volume, revogação de aparelhos, votos negativos, relógio do karaokê e importação individual/completa sem duplicar.
- **10/10 scripts de navegador aprovados na execução completa:** fluxo geral, YouTube simulado, início automático, layout/scroll, temas/PIN, playlists/QR, participantes, reprodução remota, karaokê e expansão/importação de playlists. Inclui término natural de toda a fila WAV com saída virtual, recuperação quando o evento `ended` é omitido, D-pad, Enter, popup, reconexão e larguras de 320 a 1440 px. Capturas de playlist/contagem mobile inspecionadas visualmente.
- A regressão encontrou e corrigiu uma regra antiga de CSS que escondia o QR no modo Música em telas pequenas. Os testes agora exigem QR visível nos tamanhos responsivos. Atualizados os seletores de playlists já adicionadas e a navegação por setas para considerar links, campos e expansores.
- **Dois testes com API real do YouTube aprovados:** 24 resultados do primário validados, 20 da reserva com cache confirmado e uma chamada `search.list`; 200 faixas válidas de 200 itens de playlist pública. Nenhum desses testes adicionou músicas à festa do usuário. Login pessoal real não foi repetido; o fluxo OAuth foi exercitado com provedor de teste isolado.
- **TypeScript, build de produção e formatação aprovados.** A verificação privada não encontrou os valores de API key/Client ID/Client Secret em 136 arquivos de código/documentação nem em 27 arquivos públicos do build.
- **Smoke pelo Windows aprovado:** HTTP 200 em `/`, `/host` e `/player`, tanto por `localhost:3100` quanto por `192.168.31.95:3100`; `/tv` e `/qr` respondem 302 para `/player`. Processo atualizado iniciado, banco/fila preservados.
- **Limites do aceite:** o áudio headless usa saída virtual conforme descrito acima; som físico prolongado, leitura de QR nos celulares que falharam, mudanças reais de rede/IP e importação de playlist pessoal devem ser confirmados no uso real. O volume do YouTube foi verificado separadamente em 37%, silêncio e 82%, e o responsável confirmou seu funcionamento. Acesso externo, PWA, Cast e planos comerciais permanecem propostas, sem publicação.
- Trabalho mantido somente em `codex/qroke-v1`, worktree `qroke-v1`. Sem push ou PR; aprovação e teste do responsável continuam necessários antes do PR.

### Validação anterior — participantes, 28/09/2026

- **45 testes unitários e 15 verificações de integração aprovados**, incluindo migração do schema 2, persistência de votos, chamadas simultâneas, nomes, dedupe, retorno à música anterior, eventos atrasados e isolamento de contas OAuth. A leitura privada em andamento é recusada se a pessoa desconectar a conta antes da resposta.
- TypeScript, build de produção e formatação aprovados. Verificação privada das três credenciais em 139 arquivos de código/documentação/bundle público sem ocorrência dos valores.
- **Seis scripts de navegador aprovados:** YouTube simulado, início após fila vazia, layout/scroll, temas/PIN, playlists/QR e participantes. Novos fluxos passaram de 320 a 1440 px, com captura e inspeção do tema claro.
- **Naquela rodada, a suíte completa de navegador ainda não estava verde (resolvido nas validações posteriores acima):** `browser-check.mjs` passa entrada, busca, player, arrasto, expiração, D-pad, temas, identidade e polling, mas excedeu 30 segundos ao concluir WAVs no Chromium headless/WSL. Foi repetido isoladamente: o relógio ficou em aproximadamente 1,47 s de um arquivo de 2 s, sem erro JavaScript/áudio. O teste permanece exigindo término real, sem skip ou avanço artificial. É compatível com a limitação de áudio do ambiente já registrada abaixo, mas o aceite de reprodução prolongada no aparelho físico continua pendente.
- O teste de arrasto foi ajustado para centralizar os alvos: ao mantê-los na borda inferior, a rolagem automática do navegador deslocava a lista durante a espera de polling. A reordenação e seu resultado na API foram conferidos.
- HTTP 200 em `/`, `/host`, `/qr`, `/tv` e monitor de convite pela URL LAN do Windows. Ainda é preciso escanear/testar nos dispositivos físicos que falharam.
- Nenhum teste com conta Google real ou nova chamada de busca oficial foi feito nesta entrega; OAuth e playlists foram validados com provedor simulado e cookies reais dos fixtures. O login real anterior foi confirmado pelo responsável em 26/09/2026.

### Validação de playlists e monitor do QR — histórico de 26/09/2026

- **40 testes unitários** e **13 verificações de integração** aprovados, incluindo state/PKCE, renovação de token, isolamento de contas, expiração do admin, paginação, duplicatas e descoberta do IP.
- Build de produção e TypeScript aprovados.
- **API real:** 200 faixas válidas nos 200 itens de uma playlist pública do canal Google for Developers; nenhuma música foi adicionada à festa durante esse teste.
- OAuth simulado no navegador passou com navegação entre origens, cookie temporário Lax, popup, retorno sem recriar o player, importação e desconexão. As credenciais reais foram copiadas para o .env privado. Em 26/09/2026, o responsável confirmou que o login Google funcionou após a orientação sobre usuários de teste. A importação de uma playlist pessoal real ainda aguarda confirmação.
- Testes de QR confirmam que a URL e o SVG mudam ao recuperar a rede, e que uma falha de acesso mostra aviso. No ambiente real, o monitor confirmou `http://192.168.31.95:3100/`. Mudança física de IP, roteador reiniciado e leitura em celular real continuam pendentes.
- Verificação privada: API key, Client ID e Client Secret não aparecem nos 98 arquivos de código/documentação nem nos 26 arquivos públicos examinados. Tokens OAuth são mantidos apenas no servidor.
- **Seis scripts de navegador aprovados em execuções verificadas:** fluxo geral/áudio, YouTube simulado, fila vazia/recuperação, layout/scroll, tema/PIN e playlists/QR. O último teste inclui Enter, importação, duplicatas, popup OAuth, desconexão e larguras 320/360/1366 px; nenhuma exceção JavaScript nos cenários monitorados.
- A regressão inicialmente excedeu 15 segundos nas últimas faixas WAV do Chromium/WSL. O áudio agora tem um elemento por faixa e libera o recurso anterior ao trocar/desmontar; os testes de término toleram até 30 segundos e continuam exigindo conclusão real de toda a fila. O fluxo geral e a recuperação passaram após esses ajustes. Isso não comprova reprodução longa em saída física; mantenha esse item no aceite. O diagnóstico mínimo com sete WAVs em HTML puro também concluiu.

### Validação anterior à integração de playlists

- Busca real: **20 músicas**, **20 vídeos de karaokê**, **49 recomendações** de `getUpNexts`.
- **26 testes unitários aprovados**, incluindo URL LAN e rejeição de QR com localhost/loopback.
- **1 teste de API oficial real aprovado** com a chave atualizada (20 resultados no primário validado e 20 na reserva).
- Checagem TypeScript e build de produção aprovados.
- **12 verificações de integração aprovadas**, incluindo disputa simultânea pelo controle administrativo e liberação após logout.
- Navegador aprovado: mobile 360 px, áudio local até o fim da fila, arrasto durante polling, abas duplicadas, 13 botões alcançáveis por setas no popup de PIN e 19 no admin, temas, QR branco, reconexão e polling. IFrame simulado: karaokê, últimos 5 s, dimensões mínimas, modos, ausência de sobreposição e avanço em erro 150. Nenhum erro JavaScript ou de hidratação.
- `npm install` e `npm audit --omit=dev` informaram zero vulnerabilidades conhecidas.
- Servidor de produção iniciado em `http://localhost:3100`: HTTP 200 confirmado pelo Windows, busca com 20 resultados oficiais validados e autenticação do PIN aprovadas.
- Regressão aprovada: PLAYER ativado com fila vazia, dois pedidos remotos iniciados e concluídos sem novo clique, incluindo navegação de `/host` para `/qr` (fixture isolada na porta 3196).
- LAN configurada: `192.168.31.95:3100` → `172.25.210.47:3100`, firewall privado restrito ao Wi-Fi/LocalSubnet; HTTP 200 e QR com URL LAN conferidos. Celular físico pendente.
- Verificação privada: nenhuma ocorrência da chave no código/documentação nem no bundle público.

- Validação da interface atualizada: QR em duas colunas e empilhado a 320/360/768 px; carrossel com quatro cartões no desktop acima da busca; Enter e feedback de inclusão; QR de karaokê em 320/360 px sem cobrir o vídeo.
- Reprodução validada com iframe simulado: scroll preserva o mesmo nó e instância; expiração administrativa não abre popup nem interrompe o vídeo. Áudio local também conclui quando o teste suprime o evento nativo de término.
- Popup validado: fechar, Escape, foco contido por Tab, D-pad, sessão ocupada e aquisição após logout de outro navegador. Contraste de pelo menos 4,5:1 nos botões e textos de TV/player verificados; movimento reduzido respeitado.
- Cinco scripts de navegador aprovados: fluxo geral, YouTube simulado, fila vazia/recuperação de áudio, layout/scroll e tema/popup. Nenhum erro JavaScript nos cenários monitorados.
- Smoke final na LAN: `/`, `/host`, `/qr` e `/tv` responderam HTTP 200; `/api/session` confirmou prazo administrativo de 120 segundos.

### Aceite por etapa da issue #1

| Etapa | Entrega no código                               | Validação / pendência                                                                   |
| ----- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| 0     | Configuração LAN e instruções WSL/Windows       | IP do Wi-Fi → WSL: HTTP 200; celular físico pendente                                    |
| 1     | Nuxt, Quasar, TypeScript; adaptador de rádio    | Build e catálogo real passaram; Premium pendente                                        |
| 2     | SQLite e rodízio com ordem manual               | Unitários e integração                                                                  |
| 3     | Busca, cache, validação e reserva               | Primário, validação oficial e reserva reais aprovados; falhas também cobertas por mocks |
| 4     | Convidado, nome, karaokê, adicionar/remover     | API com dois convidados e UI a 360 px; celulares físicos pendentes                      |
| 5     | WS, TV, QR e polling                            | Integração WS e teste de navegador                                                      |
| 6     | Host, PIN e PLAYER                              | API e áudio local; Bluetooth/YouTube reais pendentes                                    |
| 7     | Arrasto, setas e retorno ao rodízio             | Permutações/revisão testadas; toque físico pendente                                     |
| 8     | D-pad, foco e safe area                         | Teclado Chromium; Tizen/webOS/controle físico pendentes                                 |
| 9     | Controles fora do player e redução de área      | Layout implementado; conferência na TV física pendente                                  |
| 10    | PIN por teclado virtual, expiração e rate limit | Regras e servidor testados                                                              |
| 11    | Música, vídeo e karaokê por faixa               | Layout e lógica implementados; karaokê real pendente                                    |
| 12    | Próximas três, transição e movimento reduzido   | UI implementada                                                                         |
| 13    | Avanço, erro, eventos atrasados e reconexão     | API e sequência de WAVs curtos aprovadas; áudio prolongado no navegador físico pendente |
| 14    | Rádio, dedupe e prioridade humana               | Unitários, integração local e spike real do catálogo                                    |
| 15    | Biblioteca e seleção de saída                   | Indexação, bytes e WAV testados; MP3/Bluetooth/setSinkId físicos pendentes              |
| 16    | Identidade visual, mobile, temas e estados      | Chromium; teste de festa real pendente                                                  |

### Roteiro de teste do responsável antes de aprovar PR

- [ ] Abrir a URL em dois ou três celulares pelo Wi-Fi e escanear o QR.
- [ ] Entrar com nomes inválidos/repetidos; enviar várias músicas de cada pessoa e conferir a alternância durante a reprodução inteira.
- [ ] Remover a própria, tentar remover a de outro e testar remoção administrativa.
- [ ] Validar YouTube no navegador do PLAYER logado em Premium, incluindo anúncios, autoplay e cinco faixas completas.
- [ ] Misturar karaokê e música; conferir os cinco segundos finais e ausência de sobreposição ao vídeo.
- [ ] Mover por arrasto, toque e setas; adicionar outra faixa e confirmar que a ordem manual permanece.
- [ ] Percorrer PIN, fila e controles só com D-pad na Smart TV e teclado no PC/HDMI.
- [ ] Disputar o controle em dois navegadores, verificar o contador e confirmar liberação após 2 minutos ou logout, mesmo com música tocando.
- [ ] Transferir PLAYER entre PC e TV; confirmar o intervalo de transferência e ausência de som duplicado.
- [ ] Parear caixa Bluetooth e reproduzir MP3; testar seleção de saída em localhost ou escolher pelo sistema.
- [ ] Derrubar e restaurar a rede; reiniciar o servidor e confirmar fila/posição.
- [ ] Com rádio desligado, esvaziar a fila, adicionar outra música pelo celular e confirmar o início sem novo clique no PLAYER.
- [ ] Esvaziar a fila com rádio ligado, observar continuação e adicionar uma escolha humana.
- [ ] Fazer uma sessão real em aparelho de largura ≤ 360 px.
- [ ] Importar playlist pública por link; conferir duplicatas, vídeos indisponíveis e continuação dos lotes.
- [x] Conectar a conta Google — login confirmado pelo responsável em 26/09/2026.
- [ ] Escolher uma playlist própria e testar importação. Conferir que outro navegador admin não herda a conexão.
- [ ] Alterar a URL pública da worktree para um endereço válido, conferir QR atualizado sem restart e testar novamente com o celular. Confirmar recuperação após reiniciar roteador/WSL e reaplicar encaminhamento se necessário.
- [ ] Só após esses testes, aprovar a abertura de PR.

## Plano de acesso pela internet — proposta, não implementada

**Recomendação:** domínio HTTPS estável, entrada por link/QR ou código da festa e um PLAYER escolhido pelo anfitrião. Localização GPS não deve ser obrigatória: gera atrito, pode ser imprecisa em ambientes internos e não comprova autorização. Um código/link revogável atende melhor ao convite; para eventos restritos, adicionar aprovação do anfitrião. Estar fora do Wi-Fi permite enviar pedidos, mas o áudio continua saindo somente no PLAYER autorizado.

### Etapa 1 — endereço e autenticação

1. Escolher domínio próprio. Para piloto com servidor local, usar túnel HTTPS com domínio fixo e conexão de saída; para serviço alugado, hospedar backend com HTTPS gerenciado. Links temporários que mudam a cada restart não servem como endereço definitivo do QR/callback.
2. Proteger a entrada **antes** de expor o app: convite por festa, limite de tentativas, sessões revogáveis, expiração e limites de pedidos/importações. A v1 atual confia na LAN e não deve ser publicada diretamente apenas porque o PIN existe.
3. Definir `QROKE_PUBLIC_URL=https://festa.seudominio.com` e registrar exatamente `https://festa.seudominio.com/api/youtube/callback` no cliente OAuth. Ajustar `YOUTUBE_REDIRECT_URI`, consentimento, usuários de teste/verificação e política de privacidade. Manter segredos no servidor.
4. Todos entram pela mesma origem HTTPS. Configurar proxy confiável, WebSocket, cookies Secure/HttpOnly, CSRF e cabeçalhos de origem sem confiar em `X-Forwarded-*` arbitrários. Testar popup/retorno no Safari iOS e Chrome Android, inclusive login cancelado, expirado e bloqueador de popup.
5. Adicionar inicialização supervisionada, checagem de saúde e backup. Um domínio fixo mantém o QR quando o IP residencial muda, desde que servidor/túnel se reconectem. Queda de internet/energia ainda deixa a festa indisponível; QR não corrige isso.

### Etapa 2 — convite e participação

Fluxo proposto: **anfitrião cria festa → recebe QR/link e código → participante entra com nome → busca, vota ou importa → PLAYER recebe a próxima faixa**. Google é solicitado apenas ao abrir playlists pessoais. O login Google de playlists não deve automaticamente conceder administração.

- Link com segredo aleatório de pelo menos 128 bits, expiração, armazenamento por hash e possibilidade de revogar/rotacionar. Código curto de 6–8 caracteres apenas com limitação de tentativas, escopo por festa e proteção contra enumeração; não substituir o token por um número previsível.
- Convite permite solicitar entrada; sessão de participante recebe acesso apenas àquela festa. Rotação bloqueia novas entradas; expulsar/revogar deve invalidar também sessões já emitidas quando solicitado.
- Anfitrião pode fechar entrada, aprovar participantes, remover pedidos e bloquear abuso. Adicionar teto de músicas pendentes por participante e lote de playlist, cooldown e opção de aprovação de playlists grandes.
- Presença e votos ligados à sessão da festa. Para eventos com maior risco de múltiplos votos, exigir identidade de conta verificada ou convite individual; nome/cookie da v1 não impede criar vários participantes.
- Aceite: acesso por Wi-Fi e 4G/5G, duas festas sem vazamento entre elas, QR/callback estáveis após reiniciar túnel, convite expirado/revogado negado, ausência de player duplicado e limites de abuso funcionando.

**Nenhum domínio/túnel, convite público, geolocalização ou autenticação comercial foi provisionado nesta alteração.** O plano depende da escolha/aprovação de hospedagem e domínio; não exige agora outra chave Google.

## Plano de escalabilidade e comercialização — proposta, não implementada

O produto comercial deve vender a organização da festa, os controles e a operação. Não prometer YouTube Premium, ausência de anúncios, acesso pago a vídeos ou licença musical incluída. A política do YouTube exige valor independente e impõe condições ao uso comercial; o escopo de planos deve ser revisado antes de vender. Também será necessário avaliar direitos de execução pública conforme o mercado e o uso contratado, com orientação qualificada. [Guia de políticas do YouTube](https://developers.google.com/youtube/terms/developer-policies-guide).

### Modelo comercial inicial

| Oferta proposta         | Valor do QRokê                                                               | Unidade de cobrança a validar                                 |
| ----------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Evento avulso / aluguel | Festa temporária, convite, fila colaborativa e controles                     | Um evento com prazo, capacidade e suporte definidos           |
| Pro                     | Gestão recorrente, festas salvas, moderação e relatórios da operação         | Assinatura por estabelecimento e limite de festas simultâneas |
| Premium / negócios      | Múltiplas unidades, papéis de equipe, identidade visual e suporte contratado | Assinatura com limites negociados por organização             |

Nomes, preços, durações e limites são hipóteses de produto. Validar demanda e custo por festa antes de fixá-los. Não limitar/cobrar a reprodução de um vídeo do YouTube como benefício pago; a diferenciação precisa estar nas funções próprias de gestão. Validar também a nomenclatura “Premium” para não sugerir associação ao YouTube Premium. Sem checkout ou cobrança implementados.

### Evolução técnica por fase

| Fase                            | Entrega prevista                                                                                       | Critério de conclusão                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| A. Piloto remoto                | Domínio HTTPS, convite, moderação, sessão segura, supervisão e métricas                                | Celulares reais por redes diferentes; recuperação de falhas e isolamento de sessão                    |
| B. Várias festas                | Organizações, estabelecimentos, usuários, memberships e `party_id` em toda consulta/evento             | Testes negativos de acesso cruzado; migração preservando a festa atual como primeira organização      |
| C. Persistência e sincronização | PostgreSQL transacional; bloqueio/revisão por festa; Redis para presença, limites e fan-out de eventos | Reordenação, votos, importação e lease de PLAYER corretos sob concorrência/reconexão                  |
| D. Assinaturas                  | Planos/entitlements no servidor, provedor de pagamento, webhook assinado e idempotente                 | Testes de compra, renovação, cancelamento, inadimplência, reembolso e repetição de eventos em sandbox |
| E. Operação comercial           | Backups/restauração, auditoria, exclusão/exportação de dados, alertas e suporte                        | Teste de restauração e carga, metas de disponibilidade e processos de atendimento acordados           |

A v1 segue com **uma festa, um processo Node e SQLite local**. Não multiplicar réplicas compartilhando esse arquivo. Na migração, cada requisição e WebSocket precisa validar organização/festa e papel; o cliente não pode escolher um `party_id` sem permissão.

Modelo sugerido: `organizations → venues → parties`, com `memberships`, `guests`, `queue_items`, `playlist_imports`, `votes`, `player_leases`, `subscriptions` e `entitlements`. Índices únicos para um voto por participante/música e uma lease ativa de PLAYER por festa. Comandos idempotentes, ordenação por revisão e recuperação por snapshot quando a conexão perder eventos. Transações/locks por festa evitam que duas réplicas avancem a música ao mesmo tempo.

Tokens OAuth devem permanecer separados por usuário e protegidos por criptografia com gestão de chaves no servidor se precisarem persistir entre réplicas/restarts. Aplicar menor escopo, revogação, expiração, retenção mínima e auditoria sem segredos. Manter a identidade de acesso ao aplicativo separada da conexão opcional às playlists Google.

### Capacidade, custo e dependências

- Medir convidados simultâneos, festas ativas, pedidos/votos por segundo, tempo de importação e latência de entrega ao PLAYER. Começar com testes de 10/50/100 convidados por festa e depois 10/50 festas; são **cenários propostos**, não capacidade já comprovada.
- Definir metas após medir: p95 de comando/atualização, taxa de erro, CPU/memória, transações, conexões, quota Google e tempo de recuperação. Testar também rajada de entrada por QR e playlists de 200 itens simultâneas.
- A API transmite estado/metadados. Vídeo/áudio YouTube permanece no iframe oficial, sem proxy, download ou extração de áudio pelo QRokê.
- Aumentar cache permitido, limitar chamadas por organização/usuário, controlar concorrência de importação e rejeitar trabalho excedente com mensagem clara. Planejar orçamento e auditoria de quota com o Google; não distribuir chamadas entre projetos para contornar limites. [Quota e auditorias](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits).
- O catálogo `ytmusic-api` atual é não oficial. Antes de vender SLA, revisar compatibilidade de políticas e migrar/validar um provedor suportado com quota suficiente; não assumir que a disponibilidade atual atende um SaaS.
- Compor preço a partir de hospedagem, banco, sincronização, logs, suporte, impostos e taxas do provedor de pagamento. Validar margem e política de cancelamento em piloto; nenhum preço ou retorno financeiro é garantido por esta análise.

Aprovação para implementar deve selecionar primeiro **piloto com túnel em domínio fixo** ou **backend hospedado**, domínio, capacidade inicial e oferta comercial. Depois executar A → B → C → D → E, com validação entre fases; a abertura de PR continua dependendo do teste e aprovação do responsável.

## Limites e próximos passos

O plano original permanece como referência, mas contém premissas que exigem confirmação física; a matriz acima registra o estado real da implementação. O artefato externo do Claude e a issue não foram editados.

Ainda não incluídos: PWA/HTTPS gerenciado, Spotify/Deezer, votação para pular, painel de estatísticas, descoberta mDNS de `qroke.local`, leitura de tags ID3, atualização de biblioteca sem restart e suporte certificado a navegadores antigos de Smart TV. TV real pode exigir ajustes de compatibilidade apesar dos testes no Chromium.

O catálogo não oficial pode mudar; sua interface isolada permite substituir o provedor. A API oficial permanece uma reserva limitada, não uma promessa de capacidade para toda a festa. Premium, codec, Bluetooth, setSinkId e acesso LAN dependem do ambiente.

Para backup, encerre o servidor e preserve a pasta `.data` completa, incluindo eventuais arquivos WAL/SHM. Para começar outra festa, mantenha o banco antigo e configure um novo caminho em `QROKE_DATABASE`. Não substitua um banco em uso.
