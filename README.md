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

| Variável                | Padrão / significado                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `QROKE_HOST_PIN`        | Obrigatório para administrar. De 4 a 8 dígitos; não existe PIN embutido no app. O `1234` do exemplo deve ser trocado.                                                          |
| `QROKE_PORT`            | `3000`. Porta HTTP usada por dev e `npm start`.                                                                                                                                |
| `QROKE_PUBLIC_URL`      | URL acessível na LAN, como `http://192.168.31.95:3100`. Sem valor, o QR usa a origem da aba. Se abrir a aba por localhost, configure essa variável antes de compartilhar o QR. |
| `YOUTUBE_API_KEY`       | Opcional. Validação oficial de incorporação e busca de emergência. Exclusiva do servidor.                                                                                      |
| `QROKE_MUSIC_DIR`       | Pasta de músicas, incluindo subpastas. Vazia desabilita a biblioteca local.                                                                                                    |
| `QROKE_QUOTA_DAILY_CAP` | `90` **requisições de busca oficial por dia**, não unidades. Cache hits não consomem essa reserva.                                                                             |
| `QROKE_DATABASE`        | `.data/qroke.sqlite`, relativo ao diretório em que o processo inicia.                                                                                                          |

`.env`, banco, arquivos gerados e capturas de teste estão no `.gitignore`. Só `.env.example` é versionado. Use um único processo Node e um único banco para cada festa.

### Rede Windows / WSL

A inspeção em 25/09/2026 encontrou **Windows Wi-Fi `192.168.31.95`** e **WSL `172.25.210.47`**. Esses endereços podem mudar. O IP `172.27.113.230` registrado no plano já não correspondia ao ambiente.

O teste de resposta HTTP fixa em `0.0.0.0:3100` no WSL foi acessado com sucesso pelo Windows em `http://172.25.210.47:3100`. Isso **não comprova** acesso de outro aparelho pelo Wi-Fi. O aceite por celular continua pendente.

1. Inicie o app e confirme a porta apresentada.
2. Confira o IP atual do Wi-Fi com `Get-NetIPAddress -AddressFamily IPv4` e o WSL com `wsl.exe hostname -I`.
3. No celular conectado ao mesmo Wi-Fi, abra a URL configurada em `QROKE_PUBLIC_URL`.
4. Se não alcançar: confira isolamento de clientes no roteador e o modo de rede do WSL. Em modo espelhado, pode ser necessária uma regra de entrada no firewall Hyper-V. Em NAT, o IP privado do WSL não é automaticamente acessível pela LAN; use encaminhamento apropriado ou rode o servidor nativamente no Windows.
5. Só compartilhe o QR depois desse teste.

Exemplo para **WSL em modo espelhado**, em PowerShell elevado, ajustando a porta efetivamente usada:

```powershell
New-NetFirewallHyperVRule -Name QRoke -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 3100 -Action Allow
```

Nenhuma regra de firewall ou configuração de rede foi alterada nesta implementação. A tentativa inicial de usar um servidor de arquivos genérico foi recusada pela revisão automática por expor a worktree; o teste foi substituído por um handler que devolvia apenas texto fixo. Consulte a [documentação de rede do WSL](https://learn.microsoft.com/en-us/windows/wsl/networking).

## Usar na festa

1. Abra `/host`, informe o PIN e mantenha essa aba disponível.
2. Abra `/tv` na TV ou no PC conectado por HDMI. Abra o app também no aparelho que deve produzir som.
3. No host, escolha o aparelho na lista **Onde o som toca**, ou use **Tocar neste dispositivo**.
4. Nesse aparelho, pressione **Ativar som**. A autorização de autoplay depende do navegador.
5. Mostre `/qr` e peça aos convidados para entrarem pelo mesmo Wi-Fi.
6. Cada pessoa informa o nome, busca e pressiona **+**. Pode adicionar várias músicas. Um pedido já pendente da mesma pessoa não é duplicado por toque repetido.
7. O convidado remove seus próprios pedidos pendentes; o admin remove qualquer pedido, pula a atual e reordena.
8. Para terminar a administração, use **Sair do admin**. Sem interação, a sessão também expira em cinco minutos.

### Um PLAYER por vez

Qualquer uma das quatro telas pode receber o papel. Em `/qr`, o player só aparece quando aquela aba é escolhida; normalmente a tela permanece dedicada ao convite.

Cada aba recebe identificação e credencial privada em `sessionStorage`. O host escolhe o identificador público; eventos de reprodução exigem a credencial privada correspondente. Abrir outra aba cria outro candidato a PLAYER. Um handshake via BroadcastChannel detecta cópias de sessionStorage em abas duplicadas e emite outra credencial. Em navegadores sem BroadcastChannel, cada recarga registra um novo dispositivo e requer selecioná-lo novamente no host.

A transferência entre aparelhos introduz uma janela de **9 segundos** antes de o novo tocar. O anterior para ao receber o novo estado ou ao ficar **8 segundos** sem contato com o servidor. Eventos atrasados de faixas antigas são ignorados. No YouTube, uma aba oculta ou com menos de metade do player visível pausa a reprodução; mantenha o aparelho PLAYER em primeiro plano. Áudio local pode continuar enquanto você navega pelos controles ou alterna abas.

A faixa e a posição sobrevivem a restart. Após recarregar a página, pode ser necessário pressionar **Ativar som** novamente. Se o aparelho desaparecer, escolha outro no host; o app não transfere automaticamente o som para um convidado.

### YouTube, Premium e modos

A busca usa `ytmusic-api`; o playback usa o **IFrame oficial em `youtube.com`**. Não há download, extração de áudio, OAuth ou credencial Google no servidor.

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

SQLite armazena o estado da festa como um snapshot JSON transacional em `party`, e usa tabelas separadas para convidados, sessões admin, dispositivos, tentativas de PIN e quota. A versão inicial do schema é 1. Essa escolha atende uma festa em um processo; **não é uma arquitetura de múltiplas instâncias**. O histórico pertence à festa e permanece no banco; não há painel de estatísticas, rotação automática ou botão para apagar a festa nesta v1.

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

### Credencial correta: API key, sem OAuth na v1

Os campos “Origens JavaScript autorizadas” e “URIs de redirecionamento” pertencem a um cliente OAuth. Eles não configuram a chave usada pelo QRokê. No Console Google Cloud:

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

PIN nunca é validado no cliente. Sessões admin são revogáveis e expiram por inatividade. A API checa origem das mutações, exige JSON, valida esquemas e limita o tamanho declarado do corpo. A identificação do PLAYER também separa ID público de token privado.

HTTP em LAN e PIN compartilhado são o escopo deste projeto. Não publique o servidor diretamente na internet.

## Testar

```bash
npm test
npm run typecheck
npm run build
npm run test:integration
npm run test:browser
npm run spike:catalog
# Opt-in: usa a chave do .env e consome uma busca oficial de reserva.
npm run test:youtube
```

- **Unitários:** rodízio durante inclusão e consumo, camada automática, ordem manual, nomes, normalização, dedupe, sinal negativo do skip, cache, fallback, quota, sessões, persistência, caminhos e intervalos de bytes.
- **Integração:** processo de produção real em `127.0.0.1:3197`, banco e sete WAVs temporários. Cobre quatro rotas, dois convidados, cookies, autorização, WS, reordenação, eventos atrasados, restart, rádio e rate limit.
- **Navegador:** servidor isolado em `127.0.0.1:3198`, Chromium headless, contextos independentes. Gera capturas em `test-results/`. Verifica mobile 360 px, fluxo de pedidos, áudio local, controles do host, navegação por setas, tema, QR e polling.
- **Spike real:** consulta o YouTube Music sem credenciais. Requer internet; não valida Premium.
- **YouTube oficial, opt-in:** valida resultados reais e força uma falha do primário para testar uma chamada de reserva. Após a correção da credencial, o teste oficial passou: 20 faixas validadas via videos.list, 20 faixas na reserva e cache confirmado, com uma chamada search.list. A tentativa anterior foi recusada com API_KEY_INVALID antes de chegar à reserva.

A expiração administrativa preserva a instância do PLAYER; o servidor continua aceitando eventos de reprodução pela credencial do dispositivo. O teste simula a expiração sem esperar cinco minutos.

**Limitação observada no teste estendido:** com WAVs de 8 segundos, o relógio de áudio do Chromium headless no WSL desacelerou após algumas transições, mesmo com o arquivo totalmente carregado e sem erro de reprodução. O comportamento também foi reproduzido em uma sequência de áudio HTML puro, fora do app. A suíte padrão usa WAVs de 2 segundos e passou; reprodução prolongada em navegador normal/saída física continua sendo um aceite obrigatório. Para reproduzir o diagnóstico: `QROKE_TEST_TRACK_SECONDS=8 npm run test:browser`.

O teste de navegador usa `QROKE_CHROMIUM` quando informado; por padrão usa o Chromium headless correspondente à versão instalada do Playwright. Evite forçar uma versão antiga do cache. Em outra máquina, execute `npx playwright install chromium --only-shell` antes. Os testes usam dados próprios e removem apenas seus diretórios temporários ao encerrar; não alteram sua festa.

### Resultado desta execução

- Busca real: **20 músicas**, **20 vídeos de karaokê**, **49 recomendações** de `getUpNexts`.
- **21 testes unitários aprovados**.
- **1 teste de API oficial real aprovado** com a chave atualizada (20 resultados no primário validado e 20 na reserva).
- Checagem TypeScript e build de produção aprovados.
- **11 verificações de integração aprovadas** (suíte e dez cenários).
- Navegador aprovado: mobile 360 px, áudio local até o fim da fila, arrasto durante polling, abas duplicadas, 16 botões alcançáveis por setas no PIN e 19 no admin, temas, QR branco, reconexão e polling. IFrame simulado: karaokê, últimos 5 s, dimensões mínimas, modos, ausência de sobreposição e avanço em erro 150. Nenhum erro JavaScript ou de hidratação.
- `npm install` e `npm audit --omit=dev` informaram zero vulnerabilidades conhecidas.
- Servidor de produção iniciado em `http://localhost:3100`: HTTP 200 confirmado pelo Windows, busca com 20 resultados oficiais validados e autenticação do PIN aprovadas.
- Verificação privada: nenhuma ocorrência da chave no código/documentação nem no bundle público.

### Aceite por etapa da issue #1

| Etapa | Entrega no código                               | Validação / pendência                                                                   |
| ----- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| 0     | Configuração LAN e instruções WSL/Windows       | Windows → WSL passou; celular pelo Wi-Fi pendente                                       |
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
- [ ] Deixar admin inativo por cinco minutos e confirmar o bloqueio, mesmo com fila e player ativos.
- [ ] Transferir PLAYER entre PC e TV; confirmar o intervalo de transferência e ausência de som duplicado.
- [ ] Parear caixa Bluetooth e reproduzir MP3; testar seleção de saída em localhost ou escolher pelo sistema.
- [ ] Derrubar e restaurar a rede; reiniciar o servidor e confirmar fila/posição.
- [ ] Esvaziar a fila com rádio ligado, observar continuação e adicionar uma escolha humana.
- [ ] Fazer uma sessão real em aparelho de largura ≤ 360 px.
- [ ] Só após esses testes, aprovar a abertura de PR.

## Limites e próximos passos

O plano original permanece como referência, mas contém premissas que exigem confirmação física; a matriz acima registra o estado real da implementação. O artefato externo do Claude e a issue não foram editados.

Ainda não incluídos: PWA/HTTPS gerenciado, OAuth, Spotify/Deezer, votação para pular, painel de estatísticas, descoberta mDNS de `qroke.local`, leitura de tags ID3, atualização de biblioteca sem restart e suporte certificado a navegadores antigos de Smart TV. TV real pode exigir ajustes de compatibilidade apesar dos testes no Chromium.

O catálogo não oficial pode mudar; sua interface isolada permite substituir o provedor. A API oficial permanece uma reserva limitada, não uma promessa de capacidade para toda a festa. Premium, codec, Bluetooth, setSinkId e acesso LAN dependem do ambiente.

Para backup, encerre o servidor e preserve a pasta `.data` completa, incluindo eventuais arquivos WAL/SHM. Para começar outra festa, mantenha o banco antigo e configure um novo caminho em `QROKE_DATABASE`. Não substitua um banco em uso.
