# QRokê

Uma jukebox para festas na rede local. Cada convidado escolhe músicas pelo celular; a fila intercala as pessoas e um único dispositivo reproduz o som. Música, vídeo e karaokê compartilham a mesma fila.

> Implementação da [issue #1 — execução da v1](https://github.com/nwxdev/qroke/issues/1), baseada em [docs/plano.md](docs/plano.md).
> Trabalho concentrado em **`codex/qroke-v1`**, na worktree **`/home/rpolan/projects/nwx/qroke-v1`**. Nenhum PR ou push realizado. Abrir PR somente depois dos testes e da aprovação do responsável.

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

| Rota    | Uso                                                          |
| ------- | ------------------------------------------------------------ |
| `/`     | Entrada do convidado, busca, karaokê, biblioteca e pedidos   |
| `/host` | PIN, fila, reordenação, modo de exibição e escolha do PLAYER |
| `/tv`   | Tela da festa, próximas três e controles por D-pad           |
| `/qr`   | QR grande para os convidados                                 |

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

- **Convite `/qr`:** QR à esquerda e fila à direita, atualizada pela conexão da festa. A faixa atual tem destaque. Em telas de até 760 px os blocos ficam empilhados; a lista tem rolagem própria e a página não transborda horizontalmente.
- **Busca `/`:** a fila vem antes da busca em um carrossel. Telas grandes exibem quatro cartões; tablets, dois; celulares, um cartão e parte do próximo para indicar o arrasto. Setas, toque, trackpad e teclado permitem percorrer a lista. A fila administrativa em `/host` mantém seus controles de reordenação.
- **Enter:** o campo de busca aceita Enter e anuncia a ação de pesquisa ao teclado do celular. O envio é bloqueado durante uma consulta em andamento para evitar duplicação.
- **Feedback:** o botão de adicionar muda para confirmação com uma animação curta; entradas, saídas e reordenações da fila têm transições. A legenda do player transiciona ao mudar a música. As animações usam Vue/CSS, sem dependência adicional, e respeitam `prefers-reduced-motion`.
- **Scroll:** o YouTube passa a um player flutuante quando menos de 60% do espaço original está visível. O mesmo iframe e a mesma instância continuam tocando. A área mantém seu espaço para não deslocar a página; **Voltar** retorna ao local original. O player permanece com pelo menos 200 × 200 px, com controles do app fora do vídeo. Uma aba oculta ainda pausa o vídeo.
- **Karaokê `/tv`:** o QR permanece em um canto numa coluna reservada, inclusive na expansão do vídeo, nos cinco segundos finais e com os controles abertos. O comando para ocultar QR não é mostrado durante karaokê. O player flutuante ocupa o lado oposto ao QR, sem cobrir o código.
- **Temas:** texto sobre botões usa a cor de contraste do tema; a imagem de fundo da TV fica suave no tema claro. Os textos dentro da superfície escura do player mantêm sua própria paleta legível. Ícones dos controles herdam a cor do texto.
- **PIN em popup:** Liberar controles abre um diálogo acima da interface, com botão de fechar, Escape/Back e foco contido. O teclado numérico da TV continua aceitando D-pad. Enquanto o PIN estiver aberto, o vídeo fica temporariamente oculto/pausado para o diálogo não cobrir o YouTube; fechar retoma o estado anterior. Áudio local continua independente da administração.

### Um anfitrião por vez

`QROKE_ADMIN_LEASE_SECONDS=120` define **2 minutos de controle exclusivo**, contados do login. Aceita de 30 a 3600 segundos; configuração inválida usa 120. Altere no `.env` da worktree e reinicie o servidor. A configuração afeta as próximas sessões; o prazo da sessão vigente permanece no banco.

A interface mostra um contador. Durante a reserva, outro navegador recebe aviso e aguarda: a API responde 409 a um PIN válido que dispute o controle. Não há transferência forçada nem fila automática de solicitações. Ao expirar ou clicar **Sair do admin**, qualquer anfitrião pode entrar novamente com o PIN. Atividade, consultas de estado, `touch` e novo login do mesmo proprietário **não prolongam** o prazo.

A exclusividade é garantida no SQLite por transação imediata e índice único, não apenas pelo botão desabilitado. Duas requisições simultâneas resultam em um vencedor; o outro não recebe credencial administrativa. Sessões antigas/expiradas perdem acesso à API, mas o PLAYER continua autorizado pela credencial independente do aparelho. A expiração não abre o PIN automaticamente e não interrompe a música; use Liberar controles quando quiser administrar novamente.

Abas do mesmo navegador/origem compartilham o cookie e são a mesma sessão administrativa. `localhost` e o IP da LAN são origens diferentes: prefira uma URL consistente ou saia da sessão anterior antes de trocar.

O schema SQLite passa para **2**. A migração adiciona o prazo e a unicidade e revoga as sessões administrativas do modelo antigo, preservando convidados, fila, histórico, dispositivos e quota. Após atualizar, informe o PIN novamente. O prazo de uma sessão nova sobrevive ao reinício do servidor.

### Recuperação no fim de áudio local

Cada faixa local usa seu próprio elemento de áudio. Ao trocar de faixa ou sair do PLAYER, o elemento anterior é pausado e sua fonte liberada; eventos residuais mantêm o identificador anterior. A expiração do admin e a rolagem continuam preservando a reprodução da faixa atual.

Além do evento nativo `ended`, o PLAYER verifica se o áudio está no último centésimo de segundo, sem seek, com reprodução elegível, por pelo menos dois segundos. Se o navegador omitir o evento, envia o término com o identificador da faixa. O servidor continua ignorando eventos atrasados/duplicados. Essa recuperação não se aplica ao YouTube e não avança áudio pausado pelo anfitrião.

### Playlists do YouTube no admin

Em `/host`, libere os controles com o PIN e abra **Playlists do YouTube**:

- **Colar link**: aceita URL de playlist do YouTube ou YouTube Music (parâmetro `list=`), ou seu ID. Usa `YOUTUBE_API_KEY` no servidor para ler listas públicas/não listadas, suas ou de outros canais.
- **Minha conta**: autorize o Google em um popup para listar as playlists **criadas pela conta selecionada**, inclusive privadas. Estar logado no player não autoriza a API; playlists apenas salvas de outros canais podem ser importadas pelo link.
- **Conferir → Adicionar músicas**: mostra as faixas e os itens ignorados antes de inserir. Se o PLAYER já estiver ativado e livre, começa a tocar. Não substitui a música atual. O rodízio dos convidados continua; as playlists usam a identidade “Playlist do anfitrião” e mantêm sua ordem entre si.
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

Tokens de acesso/renovação ficam **somente na memória do servidor**, por até 8 horas, vinculados a um cookie HttpOnly do navegador. Não são enviados ao JavaScript, banco ou Git. Reiniciar o servidor exige reconectar o Google; a fila já importada permanece no SQLite. **Desconectar** remove o acesso local e as prévias privadas, preservando as faixas já adicionadas. Para revogar a autorização no Google também, remova o acesso em [Conexões da Conta Google](https://myaccount.google.com/connections).

A autorização usa state descartável, cookie temporário SameSite Lax e PKCE. O cookie administrativo continua SameSite Strict. O retorno do Google **não libera nem renova o admin**: se os 2 minutos acabarem durante o consentimento, entre com o PIN novamente. Cada leitura/importação exige a lease administrativa; dados privados são conferidos novamente após chamadas remotas. Outro navegador que assumir o admin não recebe a conexão Google anterior. Prévias valem por 5 minutos, pertencem à sessão que as criou e só podem ser adicionadas uma vez; ao trocar a sessão admin, confira a lista novamente.

As chamadas de playlists usam a quota do projeto Google separadamente do limite local de buscas de emergência. Não precisam fazer uma pesquisa por música. Não há gravação, alteração ou exclusão de playlists na conta Google.

Referências oficiais: [playlists da conta com mine=true](https://developers.google.com/youtube/v3/docs/playlists/list), [paginação dos itens](https://developers.google.com/youtube/v3/docs/playlistItems/list) e [OAuth para aplicativos Web](https://developers.google.com/identity/protocols/oauth2/web-server).

### QR com verificação e atualização do endereço

Enquanto uma tela com QR estiver aberta, ela verifica o endereço a cada **30 segundos**, ao recuperar a conexão e ao voltar para a aba. `/qr` também oferece **Verificar acesso**. O servidor reutiliza o resultado por até 15 segundos e confere uma identificação própria em `/api/network/probe`; uma página qualquer respondendo HTTP 200 não é suficiente.

O monitor relê apenas `QROKE_PUBLIC_URL` do `.env` da worktree, sem reiniciar o player. Se o endereço mudar, a URL e a imagem do QR são regeneradas. Se o IP privado configurado parar de responder, o servidor procura os IPs privados atuais da máquina e só troca para um deles quando alcançar **esta mesma instância do QRokê**. No WSL, consulta as interfaces privadas do Windows via PowerShell; no Linux nativo, usa as interfaces locais. Um domínio/HTTPS configurado não é substituído por IP local.

Se o IP mudar e a nova porta ainda não estiver encaminhada, a tela avisa. Ela não anuncia o novo endereço como funcional nem modifica firewall/roteador. O QR anterior fica visível com o aviso até a conectividade voltar; um celular aberto no endereço antigo precisa escanear o novo QR. Também não é possível detectar cada falha de leitura de câmera ou verificar o Wi-Fi de todos os celulares; o probe confirma acesso do servidor pela URL anunciada, não substitui o teste físico no celular.

Reiniciar o roteador pode mudar o IP atribuído por DHCP. Reserve o IP do computador no roteador para reduzir esse risco. Reiniciar o WSL também pode mudar seu IP interno, exigindo reaplicar `scripts/wsl-lan.ps1` com o IP privado atual do Windows. Uma simples regeneração da imagem não corrige porta bloqueada, Wi-Fi desconectado ou isolamento entre clientes.

`QROKE_INVITE_ENV_FILE` é opcional (padrão `.env`): define qual arquivo fornece a URL pública para releitura. Para executar o servidor compilado diretamente, use `NUXT_INVITE_ENV_FILE`; valor vazio desliga a releitura e mantém `NUXT_PUBLIC_PARTY_URL`. A descoberta de IP é somente leitura e só ocorre quando a URL privada falha; no WSL requer interoperabilidade com PowerShell.

## Usar na festa

1. Abra `/host`, informe o PIN e mantenha essa aba disponível.
2. Abra `/tv` na TV ou no PC conectado por HDMI. Abra o app também no aparelho que deve produzir som.
3. No aparelho que vai emitir som, entre como anfitrião e clique em **Tocar neste dispositivo**. A ação seleciona o PLAYER e ativa o som em um clique, mesmo com a fila vazia. Na TV, use **Ativar som nesta TV**, informe o PIN e escolha **Tocar neste dispositivo**.
4. Para escolher outro aparelho à distância, use a lista **Onde o som toca** e pressione **Ativar som** nesse outro navegador. Se o navegador bloquear autoplay, o aviso pede o clique local.
5. Mostre `/qr` e peça aos convidados para entrarem pelo mesmo Wi-Fi.
6. Cada pessoa informa o nome, busca e pressiona **+**. Pode adicionar várias músicas. Um pedido já pendente da mesma pessoa não é duplicado por toque repetido.
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

A busca usa `ytmusic-api`; o playback usa o **IFrame oficial em `youtube.com`**. Não há download, extração de áudio, OAuth ou sessão Google/Premium no servidor. A API key da Data API é usada apenas no backend para o catálogo.

- **Vídeo:** player grande, fila ao lado.
- **Música:** player visível com mínimo de 200 × 200 px.
- **Karaokê:** selecionado na busca do convidado, por faixa. Busca vídeos nas grafias `karaoke` e `karaokê`. Na TV, a área de reprodução se expande; nos cinco segundos finais, libera espaço para a fila e as próximas três.
- Controles, PIN e lista ficam fora do retângulo do player. A abertura dos controles reduz a área do vídeo.
- O fundo usa a thumbnail desfocada, sem um segundo player.
- Erros de vídeo 2, 5, 100, 101 e 150 avançam a fila. Outros erros, como 153, exibem orientação para corrigir o ambiente.
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

Teclado numérico 3 × 4, safe area de 5%, foco de alto contraste e suporte a `prefers-reduced-motion`. Setas de reordenação nas extremidades permanecem visíveis e desabilitadas. O PIN é validado no servidor; cinco tentativas por IP a cada minuto. Polling, progresso do player e consultas de sessão **não renovam** a sessão administrativa; interações renovam.

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

SQLite armazena o estado da festa como um snapshot JSON transacional em `party`, e usa tabelas separadas para convidados, sessões admin, dispositivos, tentativas de PIN e quota. O schema é 2, com migração da sessão administrativa para prazo absoluto e exclusividade. Essa escolha atende uma festa em um processo; **não é uma arquitetura de múltiplas instâncias**. O histórico pertence à festa e permanece no banco; não há painel de estatísticas, rotação automática ou botão para apagar a festa nesta v1.

### Rodízio e ordem manual

A prioridade é: **humano antes de automático**, depois ordem manual, rodada e instante de inclusão.

Uma implementação que recalcula as rodadas considerando apenas as faixas pendentes perde a justiça durante o playback: ao tocar Ana 1, Ana 2 pode voltar à rodada zero e passar à frente de Bruno 1. O código considera também as rodadas já servidas e a faixa atual. Assim, consumir a fila preserva `Ana 1 → Bruno 1 → Ana 2 → Bruno 2 → Ana 3`. Um teste cobre essa regressão.

A expressão `manual_order NULLS LAST` do plano, aplicada só ao item arrastado, não permite colocá-lo em qualquer posição entre itens automáticos do rodízio. Por isso, cada reordenação grava uma **permutação completa da fila pendente** com índices manuais. Novos pedidos ficam depois desse bloco, respeitando a camada humana. **Voltar ao rodízio** limpa todos os índices.

Reordenação usa a revisão do estado. Se outra ação alterou a fila durante o arrasto, o servidor retorna 409 e a UI atualiza/reverte. Progresso de playback não altera essa revisão. Não é permitido mover uma automática antes de uma humana.

### Busca e quota

- Normalização de espaços, caixa e Unicode; consultas de 2 a 120 caracteres.
- Cache de busca por cinco minutos, até 256 consultas; catálogo de resultados selecionáveis por uma hora, até 10.000 entradas.
- Consultas idênticas simultâneas compartilham a mesma chamada. Até quatro consultas diferentes simultâneas e 60 buscas/minuto por IP.
- Karaokê combina as duas grafias e remove IDs duplicados.
- Com chave, `videos.list` filtra vídeos não públicos ou não incorporáveis e obtém duração e metadados. Até 24 resultados por lote.
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
npm run spike:catalog
# Opt-in: usa a chave do .env; busca oficial de reserva e leitura de playlist pública.
npm run test:youtube
```

- **Playlists e QR:** `tests/youtube-playlists.test.ts`, `tests/network-invite.test.ts`, `tests/playlists-integration.mjs` e `scripts/browser-playlists-check.mjs`. O provedor Google falso é injetado somente no processo de teste via preload Node; não existe bypass de OAuth na aplicação de produção.
- **Unitários:** rodízio durante inclusão e consumo, camada automática, ordem manual, nomes, normalização, dedupe, sinal negativo do skip, cache, fallback, quota, sessões, persistência, caminhos e intervalos de bytes.
- **Integração:** processo de produção real em `127.0.0.1:3197`, banco e sete WAVs temporários. Cobre quatro rotas, dois convidados, cookies, autorização, WS, reordenação, eventos atrasados, restart, rádio e rate limit.
- **Navegador:** servidor isolado em `127.0.0.1:3198`, Chromium headless, contextos independentes. Gera capturas em `test-results/`. Verifica mobile 360 px, fluxo de pedidos, áudio local, controles do host, navegação por setas, tema, QR e polling.
- **Spike real:** consulta o YouTube Music sem credenciais. Requer internet; não valida Premium.
- **YouTube oficial, opt-in:** valida resultados reais e força uma falha do primário para testar uma chamada de reserva. Após a correção da credencial, o teste oficial passou: 20 faixas validadas via videos.list, 20 faixas na reserva e cache confirmado, com uma chamada search.list. A tentativa anterior foi recusada com API_KEY_INVALID antes de chegar à reserva.

O teste `tests/playlists.live.ts` aceita `YOUTUBE_TEST_PLAYLIST_ID` para escolher outra playlist pública. Para executar somente esse teste, sem repetir a pesquisa oficial: `node --env-file-if-exists=.env node_modules/vitest/vitest.mjs run --config vitest.live.config.ts tests/playlists.live.ts`.

A expiração administrativa preserva a instância do PLAYER; o servidor continua aceitando eventos de reprodução pela credencial do dispositivo. O teste simula a expiração sem esperar o prazo real de dois minutos.

**Limitação observada no teste estendido:** com WAVs de 8 segundos, o relógio de áudio do Chromium headless no WSL desacelerou após algumas transições, mesmo com o arquivo totalmente carregado e sem erro de reprodução. O comportamento também foi reproduzido em uma sequência de áudio HTML puro, fora do app. Também houve lentidão ao anexar um sétimo WAV ao mesmo contexto durante o teste desta correção. A suíte usa WAVs de 2 segundos e testa os pedidos após fila vazia em outro contexto/processo; reprodução prolongada em navegador normal/saída física continua sendo um aceite obrigatório. Para reproduzir o diagnóstico: `QROKE_TEST_TRACK_SECONDS=8 npm run test:browser`.

O teste de navegador usa `QROKE_CHROMIUM` quando informado; por padrão usa o Chromium headless correspondente à versão instalada do Playwright. Evite forçar uma versão antiga do cache. Em outra máquina, execute `npx playwright install chromium --only-shell` antes. Os testes usam dados próprios e removem apenas seus diretórios temporários ao encerrar; não alteram sua festa.

### Validação de playlists e monitor do QR

- **40 testes unitários** e **13 verificações de integração** aprovados, incluindo state/PKCE, renovação de token, isolamento de contas, expiração do admin, paginação, duplicatas e descoberta do IP.
- Build de produção e TypeScript aprovados.
- **API real:** 200 faixas válidas nos 200 itens de uma playlist pública do canal Google for Developers; nenhuma música foi adicionada à festa durante esse teste.
- OAuth simulado no navegador passou com navegação entre origens, cookie temporário Lax, popup, retorno sem recriar o player, importação e desconexão. As credenciais reais foram copiadas para o .env privado, mas a autorização/seleção da conta real ainda depende do consentimento do responsável.
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
- [ ] Conectar a conta Google, escolher uma playlist própria e testar importação. Conferir que outro navegador admin não herda a conexão.
- [ ] Alterar a URL pública da worktree para um endereço válido, conferir QR atualizado sem restart e testar novamente com o celular. Confirmar recuperação após reiniciar roteador/WSL e reaplicar encaminhamento se necessário.
- [ ] Só após esses testes, aprovar a abertura de PR.

## Limites e próximos passos

O plano original permanece como referência, mas contém premissas que exigem confirmação física; a matriz acima registra o estado real da implementação. O artefato externo do Claude e a issue não foram editados.

Ainda não incluídos: PWA/HTTPS gerenciado, Spotify/Deezer, votação para pular, painel de estatísticas, descoberta mDNS de `qroke.local`, leitura de tags ID3, atualização de biblioteca sem restart e suporte certificado a navegadores antigos de Smart TV. TV real pode exigir ajustes de compatibilidade apesar dos testes no Chromium.

O catálogo não oficial pode mudar; sua interface isolada permite substituir o provedor. A API oficial permanece uma reserva limitada, não uma promessa de capacidade para toda a festa. Premium, codec, Bluetooth, setSinkId e acesso LAN dependem do ambiente.

Para backup, encerre o servidor e preserve a pasta `.data` completa, incluindo eventuais arquivos WAL/SHM. Para começar outra festa, mantenha o banco antigo e configure um novo caminho em `QROKE_DATABASE`. Não substitua um banco em uso.
