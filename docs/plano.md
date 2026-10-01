# QRokê — plano de implementação

> **Entregável que o usuário mantém: o artefato**
> (https://claude.ai/artifact/Mu6sAKeizBtH5pcB8zpCM2).
> Este arquivo é o plano de execução. **Pendente: atualizar o artefato** — ele ainda está na
> versão anterior, sem o nome, os três modos, karaokê, continuação automática e biblioteca
> local.

## Nome

**QRokê** — o QR desaparece dentro de "karaokê". Carrega o gesto de entrada (escanear) e a
função (cantar) numa palavra só, e se fala sem treino: *ca-ro-kê*.

Regra de grafia, porque o acento não sobrevive em contexto técnico:

| Contexto | Forma |
|---|---|
| Interface, TV, tela de QR, documentação | **QRokê** |
| Diretório, pacote npm, hostname, repositório | **`qroke`** |

Repositório: **`nwxdev/qroke`**, clonado em **`~/projects/nwx/qroke`**.
Hostname alvo: `qroke.local`; enquanto isso, `http://<ip-lan>:3000`.

---

## Contexto

Projeto **novo**, do zero, sem relação com os outros projetos da máquina.

Numa festa em casa, os convidados apontam a câmera para um QR, abrem uma página no celular,
buscam uma música e ela entra numa fila compartilhada. Uma TV mostra a fila. O som sai pelo
PC, pareado por Bluetooth com a caixa.

**Descoberta central:** busca e playback não podem vir da mesma fonte. Deezer não toca mais
nada (SDK abandonado); Spotify exige Premium do dono do app e restringiu o Dev Mode em
fev/2026; YouTube Music não tem API oficial; e `search.list` do YouTube custa 100 de 10.000
unidades diárias — 100 buscas/dia. Logo, **catálogo de busca** e **motor de playback** são
camadas separadas.

### Decisões do usuário

| Tema | Decisão |
|---|---|
| Nome | **QRokê** (`qroke` em contexto técnico) |
| Integração | **Somente YouTube agora.** Spotify e outros = roadmap, não corte |
| Motor | **YouTube** (tem Premium e usa YT Music) |
| Resultados em vídeo | **Aceitos** — e desejáveis, porque habilitam karaokê |
| Volume de busca | **≥ 1000 buscas/dia** |
| Fila | **Rodízio justo**, sem limite duro |
| Rede | **HTTP puro na LAN** (sem PWA instalável na v1) |
| Stack | **Nuxt 4 · Quasar · TypeScript** |
| Karaokê | **Ligado por busca, no celular de cada convidado** |
| Layout | Player grande, lista "a seguir" à direita; no karaokê a lista só nos 5 s finais |
| TV | **Smart TV com navegador E PC por HDMI** — mesmo contrato de teclas serve os dois |
| Remoção | **Dono da música + admin** (pelo `guestId`, sem login) |
| Admin na TV | **Liberado por PIN** digitado no D-pad, com expiração |

---

## Fase 0 — Pré-voo de rede (BLOQUEADOR)

Ambiente WSL2, IP interno `172.27.113.230` em `eth4`. O `.wslconfig` **já tem**
`networkingMode=mirrored`, mas em modo espelhado o **firewall Hyper-V bloqueia entrada da
LAN por padrão**. Se o celular não alcançar o servidor, nada mais importa.

1. HTTP trivial em `0.0.0.0:3000` dentro do WSL.
2. PowerShell (Admin): `New-NetFirewallHyperVRule -Name QRoke -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 3000 -Action Allow`
3. IP real da LAN: `wsl.exe hostname -I`.
4. **Aceite: abrir `http://<ip-lan>:3000` no celular, pelo WiFi.**

Plano B: rodar o servidor nativamente no Windows (Node 24).

---

## Orçamento de quota — como os 1000/dia fecham

Só `search.list` é caro. Tudo o mais custa 1 unidade.

| Chamada | Unidades | Papel no QRokê |
|---|---:|---|
| `ytmusic-api` (não-oficial) | **0** | **Catálogo.** Busca de música e de vídeo/karaokê |
| `videos.list` (oficial) | **1** | **Validação.** `status.embeddable`, duração, título — até 50 IDs por chamada |
| `search.list` (oficial) | 100 | Reserva de emergência: 100/dia se o primário cair |

Multiplicar projetos ou contas para ampliar quota é **proibido** ("sharding"), com revogação
de chaves e encerramento da conta Google associada como consequência declarada. Não é opção —
e nem é necessário.

---

## Credenciais e autenticação

### O que a v1 realmente exige

| Peça | Credencial | Observação |
|---|---|---|
| `ytmusic-api` (catálogo principal) | **nenhuma** | Emula o cliente web do YT Music. Sem chave, sem login. |
| `videos.list` + `search.list` | **API key** | Leitura de dado público: API key basta, OAuth não é aceito nem necessário. |
| Playback ad-free | **nenhuma no servidor** | Vem da sessão do navegador do PLAYER, logado na conta Premium. |
| Biblioteca local mp3 | **nenhuma** | Arquivos no disco. |

**Uma única credencial externa, e ela é opcional.** Sem a API key o QRokê roda; perde-se
apenas a validação de `embeddable` antes de enfileirar e a reserva de busca.

### Setup da API key

1. `console.cloud.google.com` → novo projeto `qroke`
2. APIs e Serviços → Biblioteca → habilitar **YouTube Data API v3**
3. Credenciais → Criar credenciais → **Chave de API**
4. Restringir: API → só YouTube Data API v3. Aplicativo → IP do servidor.
5. **Nunca no cliente.** Em Nuxt, `runtimeConfig.youtubeApiKey` **sem** o prefixo `public`
   fica server-only e não entra no bundle. Toda chamada à Data API passa por rota Nitro.

### Autenticação dentro do QRokê (não é Google)

- **Convidado:** sem login. Nome digitado 1× + `guestId` (uuid) em `localStorage`, espelhado
  em cookie httpOnly. É o que alimenta o rodízio.
- **Host:** PIN compartilhado (`QROKE_HOST_PIN`), só para impedir que um convidado abra o
  `/host` e pule as músicas dos outros. Não é segurança séria — é uma tranca de banheiro.

### Google OAuth — fora da v1, e por quê

Nada na v1 age em nome do usuário, então OAuth não entra. Se um dia entrar (playlists
pessoais do YT Music), três obstáculos já mapeados:

1. **Redirect URI não aceita IP de LAN.** Google exige HTTPS ou loopback; IP privado é
   rejeitado. Só `http://127.0.0.1:<porta>/…`, `http://[::1]:<porta>/…` ou
   `http://localhost:<porta>/…`. O login teria que ser feito **na máquina do servidor**,
   abrindo `http://127.0.0.1:3000/host` — nunca pelo IP da rede.
2. **Refresh token expira em 7 dias** enquanto a tela de consentimento estiver em "Testing".
   Comportamento documentado. Relogin semanal.
3. **Publicar exige verificação.** `youtube.readonly` é escopo **sensível**: justificativa,
   vídeo demo e revisão do Google.

**Exceção que muda o cálculo:** se o domínio do usuário for Google Workspace, a tela de
consentimento pode ser **"Internal"** — sem expiração de 7 dias e sem verificação.
**Verificar isso antes de descartar o OAuth do roadmap.**

### `.env` (valores de exemplo, nunca reais)

```
QROKE_HOST_PIN=1234
YOUTUBE_API_KEY=AIzaSyEXEMPLO_NAO_E_UMA_CHAVE_REAL
QROKE_PORT=3000
QROKE_MUSIC_DIR=/mnt/c/Users/<user>/Music
QROKE_QUOTA_DAILY_CAP=90
```

`.env` no `.gitignore` desde o primeiro commit, com um `.env.example` versionado ao lado.

---

## Fontes de música — duas, na mesma fila

### A. YouTube (streaming)
Busca pelo `ytmusic-api`, playback pelo **IFrame Player oficial**. Ad-free porque o navegador
do PLAYER está logado na conta Premium do usuário — e isso só vale se o iframe **enxergar a
sessão**. Três condições, todas obrigatórias:

1. **Domínio padrão `youtube.com`, nunca `youtube-nocookie.com`.** O `nocookie` é, por
   definição, sem sessão — logo, anúncio garantido, mesmo com Premium ativo. É a armadilha
   mais comum, porque parece a opção "mais correta".
2. **Cookies de terceiros liberados** especificamente para `youtube.com`. Bloqueados, o
   iframe não vê o login e o anúncio volta.
3. **Perfil normal do navegador, logado.** Aba anônima ou perfil convidado não têm Premium.

Qualquer conta do plano Family serve — vale a conta logada naquele navegador, não o titular
do plano. O Premium **não** dá nada do lado da API: cota é do projeto Cloud, não da
assinatura.

### B. Biblioteca local (mp3)
Pasta de mp3/flac/m4a no PC, indexada no boot, tocada com `<audio>` nativo.

- **Zero quota, zero ToS, zero dependência de rede.** Se a internet cair no meio da festa, a
  música não para.
- **Seleção de dispositivo de áudio funciona aqui.** `setSinkId` opera em `<audio>`
  same-origin — o que o iframe do YouTube nunca vai permitir. É o único lugar onde "escolher
  a saída" existe de verdade dentro do app.

**"Só mp3" via YouTube não existe.** O IFrame sempre reproduz vídeo; não há parâmetro de
áudio puro. Extrair o stream (yt-dlp e similares) é ripping — degrau de risco acima de tudo o
mais neste plano, e fora do escopo. A otimização real do lado oficial é manter o player
pequeno no modo música, o que faz o YouTube servir resolução menor sozinho.

---

## Os três modos de reprodução

Restrição que molda os três (ToS do YouTube, *Required Minimum Functionality*):
viewport **≥ 200×200 px**, autoplay só com **mais de 50% do player visível**, e
**proibido exibir overlay, frame ou qualquer elemento visual na frente do player**.

Técnica que concilia isso com o layout pedido: **o fundo é a thumbnail desfocada em tela
cheia — uma imagem, não o player.** A lista fica sobre o *fundo*, nunca sobre o player.

### Modo música
Player reduzido (mínimo 200×200) à esquerda, no lugar da capa. Tipografia grande com faixa e
artista, fila à direita. Player pequeno → YouTube serve resolução menor → menos banda e CPU.

### Modo vídeo — padrão da festa
Player grande à esquerda ocupando a maior parte da tela. Coluna "a seguir" à direita, sobre o
fundo desfocado, sem tocar no player.

### Modo karaokê
Player em tela cheia, sem lista. **Nos 5 segundos finais da faixa, o player encolhe com
animação** e a lista "a seguir" aparece na faixa liberada — em vez de passar por cima. O vídeo
abre espaço; nada é sobreposto.

Ligado **por busca, no celular de cada convidado** (toggle na própria tela de busca):

- A query passa a prefixar `karaoke`.
- A busca mira a seção **Vídeos** do YT Music — karaokê quase nunca é "Song".
- Tenta as duas grafias, `karaoke` e `karaokê`: o conteúdo brasileiro usa ambas.
- A faixa entra na fila marcada como karaokê; o player troca de modo **por faixa**, então
  karaokê e música normal convivem na mesma fila.

---

## Tema — escuro por padrão, por tela

**Padrão escuro em todas as telas**, sem seguir o `prefers-color-scheme` do sistema. É
decisão de produto, não preferência: a `/tv` fica ligada num cômodo escuro, e tela branca a
noite inteira incomoda e ainda arrisca burn-in em OLED com a fila e o QR parados.

**Cada tela aberta decide sozinha.** Trocar o tema na TV não pode mexer no celular de
ninguém — logo a preferência **não vai para o servidor nem para o SQLite**.

| Onde | Por quê |
|---|---|
| `localStorage`, chave **por rota**: `qroke:theme:/tv`, `qroke:theme:/host`, `qroke:theme:/` | Independente por tela **e** por dispositivo; sobrevive a refresh e a reboot da TV |
| Sem valor guardado → **escuro** | O padrão é o escuro, não o do sistema |

`sessionStorage` foi descartado: seria independente por aba, mas a TV esqueceria o tema a
cada reinício — exatamente a tela onde a persistência mais importa.

### Implementação

- **Tokens CSS** com o escuro no `:root` e `[data-theme="light"]` sobrescrevendo. Nenhuma cor
  definida só dentro de um bloco de tema.
- **Anti-flash no SSR:** Nuxt renderiza no servidor, então sem cuidado a tela pisca clara
  antes de virar escura. Um script inline no `<head>` lê o `localStorage` e aplica
  `data-theme` **antes da primeira pintura**.
- **Quasar:** manter o plugin `Dark` sincronizado com o nosso estado (`$q.dark.set(...)`), com
  a fonte da verdade sendo o `data-theme` da rota — não o contrário.
- **Toggle** presente nas quatro telas, discreto.
- **QR sempre em placa branca**, inclusive no tema escuro: módulos escuros sobre fundo claro,
  com a zona de silêncio preservada. **QR invertido é recusado por vários leitores** — e o QR
  que não escaneia mata o produto inteiro.

---

## Continuação automática

Flag ligável no front (`/host`, visível na `/tv`). Dispara quando a fila **humana** esvazia.

`relatedToVideoId` foi removido da API oficial em ago/2023 — não existe "relacionados"
oficial. Semente, em ordem:

1. Próximas/rádio do `ytmusic-api` a partir da última faixa tocada. *(A lib expõe "Upcoming
   Songs"; confirmar a assinatura no spike da Fase 1.)*
2. Fallback: artistas que já tocaram na noite, ponderados por frequência.
3. Último recurso: as mais tocadas do histórico da festa.

Três regras que fazem funcionar:

- Faixa automática entra com `origem: 'auto'` numa **camada inferior**. Qualquer escolha
  humana passa na frente, sempre — o robô nunca disputa o rodízio.
- Dedupe do que já tocou na última hora (janela configurável).
- **Skip é sinal negativo:** faixa pulada pelo host não volta, e o artista dela perde peso.

Desligar a flag remove as automáticas da fila na hora; as humanas ficam.

---

## Arquitetura

Um processo Node serve tudo: as quatro telas, a API, o WebSocket e as chaves.

| Peça | Escolha | Observação |
|---|---|---|
| App | Nuxt 4 + TypeScript | Nitro: telas + API + WS num processo |
| UI | Quasar via `nuxt-quasar-ui` | Módulo comunitário **ativo**: v3.1.1 (set/2026), `@nuxt/kit ^4.2.1`, feito para Nuxt 4. **Não usar na `/tv`** — ver *Interação e controles* |
| Realtime | Nitro WebSocket (crossws) | fallback: polling 2 s |
| Dados | SQLite (`better-sqlite3`) | a fila sobrevive a restart |
| Busca | `ytmusic-api` (npm, TS) | não-oficial — ver riscos |
| Playback | YouTube IFrame Player + `<audio>` local | duas fontes, uma fila |
| Testes | Vitest | + E2E real com celulares |

### As quatro telas

| Rota | Quem | Faz |
|---|---|---|
| `/` | Convidado (celular, via QR) | Nome 1×, busca, **toggle karaokê**, adiciona, vê posição |
| `/tv` | TV | Player nos três modos + lista "a seguir" + QR fixo |
| `/qr` | Tela dedicada | QR em tela cheia + URL em texto grande |
| `/host` | Você (PC), **PIN** | Papel de PLAYER · modo de exibição · flag de continuação · skip/remover · saída de áudio (fonte local) |

### Papel de PLAYER — a seleção de dispositivo

Qualquer cliente conectado pode receber o papel de PLAYER; só ele monta o player. O som sai da
máquina que tem o papel: PC (→ caixa Bluetooth), TV ou celular. Para faixas da **biblioteca
local**, soma-se a escolha da saída de áudio via `setSinkId`.

### Fila com rodízio justo

Cada item pendente recebe `round` = quantas faixas **do mesmo convidado** já estão pendentes à
frente dele. Ordem: `round ASC, enqueued_at ASC` →
`Ana 1 · Bruno 1 · Caio 1 · Ana 2 · Bruno 2 · Ana 3`. Itens `origem: 'auto'` ficam numa camada
abaixo de tudo isso. Peça com mais regra de negócio do sistema → **teste antes do código**.

A reordenação manual do admin interfere nessa ordem e é resolvida por `manual_order` — ver
*Gerenciamento da fila*.

---

## Interação e controles

### Contrato de input — um só para os dois cenários de TV

A `/tv` roda em **dois** cenários, ambos confirmados: **Smart TV com navegador próprio**
(Tizen, webOS, Android TV, Fire TV) e **PC ligado por HDMI**. Os dois emitem os mesmos eventos
de teclado, então não existem dois caminhos de código.

| Tecla | Smart TV | PC/HDMI | Ação |
|---|---|---|---|
| `ArrowUp/Down/Left/Right` | D-pad do controle | setas do teclado | move o foco |
| `Enter` | botão OK | Enter | ativa |
| Back | 10009 (Tizen), 461 (webOS) | `Backspace` | sai do contexto |
| `MediaPlayPause`, `MediaTrackNext` | botões de mídia | teclado multimídia | play/pause, pular |

Único ajuste por plataforma: mapear os códigos de Back de Tizen e webOS ao mesmo handler.

### Navegação espacial escrita à mão

**Decisão apoiada em evidência:** as três bibliotecas de navegação espacial do ecossistema
estão abandonadas — `js-spatial-navigation` (1.0.1), `spatial-navigation-polyfill` (1.3.1) e
`vue-spatialnavigation` (1.2.1, ainda Vue 2), **todas com última publicação em maio de 2022**.
A superfície interativa da `/tv` é pequena (uma lista e uma barra), então escrever ganha de
adotar código sem manutenção.

Implementação: **roving tabindex** (um elemento focável por vez, `tabindex="0"`/`-1`) mais um
composable `useSpatialNav()` que lê a geometria com `getBoundingClientRect()` e move o foco
para o vizinho mais próximo na direção pressionada.

**Quasar não entra na `/tv`.** Componentes de framework gerenciam o próprio `tabindex` e o
próprio foco — exatamente o que o roving tabindex precisa controlar. A `/tv` usa elementos
simples; Quasar fica na `/` e na `/host`, onde rende (formulários, diálogos, toggles).

Requisitos de TV:

- **Foco visível a 3 metros** — anel grosso, alto contraste, item focado escala
- **Safe area de 5%** em cada borda: TVs cortam as bordas (overscan)
- **Sem mouse e sem touch** — todo elemento interativo da `/tv` alcançável por D-pad, ou é
  elemento morto
- `prefers-reduced-motion` respeitado também nas animações de foco

### Barra de controles do player

Restrição inegociável, já registrada: **nada sobrepõe o player** (ToS). A barra não flutua por
cima — **o player encolhe quando a barra recebe foco**, mesma técnica aprovada para o modo
karaokê. O vídeo abre espaço em vez de ser coberto.

Conteúdo: play/pause · pular · remover a atual · modo de exibição · continuação automática.

**Busca não entra na TV.** Digitar por D-pad é sofrimento; a busca fica no celular. A TV
controla a fila, não alimenta ela.

### Modo admin na `/tv`, destravado por PIN

A `/tv` abre em modo leitura + playback. Gerenciar a fila exige destravar com o
`QROKE_HOST_PIN`, digitado pelo próprio controle.

- **Teclado numérico na tela**, grade 3×4, navegável por direcional — é o baseline confiável,
  porque os controles modernos de Samsung e LG não têm mais numérico dedicado
- **Atalho:** escuta direta de `0`–`9`, para os controles que ainda têm números

Regras, porque a TV é tela pública e o controle passa de mão em mão numa festa:

- **Expira por inatividade (5 min)** e volta sozinho ao modo leitura
- Indicador visível enquanto o modo admin está ligado, e botão explícito de sair
- Validação **no servidor**, que emite o token de sessão — nunca no cliente
- **Rate limit** por IP: 4 dígitos são 10.000 combinações, e um controle remoto tem paciência
  infinita

---

## Gerenciamento da fila

### Adicionar e remover

- **PLUS** no resultado da busca, com UI otimista: o item aparece na fila antes da confirmação
  do servidor e reverte se falhar.
- **Remover:** o **dono da música** — identificado pelo `guestId` que já alimenta o rodízio,
  sem login — e o **admin**. Autorização validada no servidor, nunca no cliente.

### Reordenar — arrastar e setas ↑/↓

Duas implementações, três formas de uso:

| Entrada | Quem usa | Como |
|---|---|---|
| **Arrastar (DND)** | mouse no PC, toque no celular | `vue-draggable-plus` (Vue 3, ativa, sobre SortableJS) |
| **Setas ↑ / ↓ no item** | todos, inclusive D-pad | um clique/toque/OK = uma posição |

As setas são **botões focáveis comuns**, então o controle da TV as usa sem nenhum mecanismo
especial — o que **elimina** o modo modal "pega, move, solta". Um estado a menos, um mental
model só. No celular também são melhores: arrastar em lista curta é impreciso, seta é exata.

- ↑ da primeira e ↓ da última ficam **desabilitadas, não escondidas** — botão que some faz o
  foco do D-pad pular de lugar e desorienta
- Alvo de toque ≥ 44 px; na TV, anel de foco grosso
- UI otimista com animação da linha, revertendo se o servidor recusar
- `aria-label` explícito ("mover *Evidências* para cima") — serve leitor de tela e serve para
  depurar o foco na TV

### `manual_order` — reordenação manual versus rodízio

**Conflito real:** a fila ordena por `round ASC, enqueued_at ASC`. Um arrasto do admin seria
desfeito no próximo recálculo do rodízio.

Solução: a reordenação manual grava `manual_order` no item, e a ordenação passa a ser

```sql
ORDER BY manual_order NULLS LAST, round ASC, enqueued_at ASC
```

Item tocado pela mão do admin sai do rodízio e fica onde foi posto. Um botão **"voltar ao
rodízio"** limpa o campo e devolve o item à regra automática. Vale igual para música e para
karaokê.

---

## Faixa das próximas 3

Carrossel horizontal na `/tv` com as **3 próximas** faixas, com **transição lateral da direita
para a esquerda**: quando uma faixa começa, as três deslizam para a esquerda e a quarta entra
pela direita. `transform: translateX()` com `transition` de 300–400 ms, `ease-out`.

- Vale para música **e** para karaokê; no karaokê aparece só nos 5 s finais, quando o player
  encolhe — consistente com a regra de não sobrepor
- Fica sobre o fundo desfocado, **nunca** sobre o player
- `prefers-reduced-motion` troca o deslize por corte seco

---

## Mobile e entrada do convidado

### Responsividade

O celular é a tela principal do convidado, e a usabilidade dela decide se a festa flui:

- Alvos de toque **≥ 44 px** em tudo que é clicável
- Uma coluna, sem scroll horizontal
- Busca com foco automático ao abrir; teclado do sistema sobe sem empurrar o layout
- PLUS grande e na zona do polegar
- **Estado de carregamento em toda ação** — rede de festa é ruim, e botão que não responde
  vira toque repetido, que vira música duplicada na fila
- Fila visível sem sair da busca
- Testar em tela pequena real (≤ 360 px), não só no emulador

### Validação do nome

Pedido uma única vez, no primeiro acesso, e guardado em `localStorage` + cookie httpOnly.

| Regra | Valor |
|---|---|
| Obrigatório | não passa vazio nem só espaços |
| `trim` | aplicado antes de validar |
| Tamanho | 2 a 20 caracteres |
| Caracteres de controle | removidos |
| Nome já usado na festa | sugere `Ana (2)` |

Dois "Ana" na TV confundem, mesmo o `guestId` sendo distinto — daí o desempate. Validação no
cliente **e** no servidor.

---

## Ordem de execução

| # | Entrega | Pronto quando |
|---|---|---|
| 0 | **Pré-voo de rede** | o celular abre `http://<ip-lan>:3000` pelo WiFi |
| 1 | Scaffold `qroke` (Nuxt+Quasar+TS) · spike do rádio do `ytmusic-api` · **spike do ad-free do Premium** | dev server em `0.0.0.0`, tela no celular, e **vídeo tocando sem anúncio no navegador do PLAYER** |
| 2 | SQLite, schema e **rodízio justo (TDD)**, incluindo `manual_order` | Vitest verde, casos de borda |
| 3 | Busca com cache, validação por `videos.list`, fallback — **requer `YOUTUBE_API_KEY`** | buscar "sertanejo" devolve `videoId` embeddable |
| 4 | Tela do convidado: **nome com validação**, busca, toggle de karaokê, **PLUS**, remover a própria | dois celulares enfileiram, o rodízio intercala e nome inválido é recusado |
| 5 | WS, `/tv` com lista ao vivo e `/qr` | a fila atualiza na TV sem refresh |
| 6 | `/host` com PIN, papel de PLAYER, IFrame | som na caixa BT; trocar o papel move o som |
| 7 | **Gerenciamento da fila no `/host`:** DND + setas ↑/↓ + `manual_order` + voltar ao rodízio | reordenar sobrevive ao recálculo do rodízio |
| 8 | **Navegação por D-pad na `/tv`:** roving tabindex, `useSpatialNav()`, safe area, foco de TV | percorrer a `/tv` inteira só com o controle, sem mouse |
| 9 | **Barra de controles** que encolhe o player ao receber foco | play/pause/pular pelo controle, sem sobrepor o player |
| 10 | **Modo admin na `/tv`** com PIN por D-pad, expiração e rate limit | destrava, reordena e expira sozinho em 5 min |
| 11 | **Os três modos de exibição** + encolher no karaokê | trocar de modo no `/host` reflete na TV em < 1 s |
| 12 | **Faixa das próximas 3** com transição lateral | a faixa desliza ao trocar de música, nos dois modos |
| 13 | Avanço automático, skip, erro 101/150, reconexão | fila de 5 toca inteira sozinha |
| 14 | **Continuação automática** com camada inferior | fila esvazia e a música continua; escolha humana passa na frente |
| 15 | **Biblioteca local mp3** + `setSinkId` | tocar um mp3 e trocar a saída de áudio pelo app |
| 16 | Acabamento: identidade QRokê, **responsividade fina**, estados vazios, queda de rede, QR alternável | teste de festa real |

---

## Verificação

- **Fase 0:** `curl` do Windows e, o que conta, abrir no celular pelo WiFi.
- **Unit (Vitest):** rodízio justo, camada `auto` versus humana, dedupe da janela de 1 h, peso
  negativo do skip, normalização de query, montagem da query de karaokê nas duas grafias.
- **Integração:** rotas Nitro com `ytmusic-api` mockado; forçar falha do primário e conferir
  que cai no fallback **e** acende o aviso no `/host`.
- **E2E real, insubstituível:** dois ou três celulares, TV e PC. Enfileirar de todos, misturar
  karaokê com música normal, deixar a fila esvaziar e ver a continuação entrar.
- **D-pad, nos dois cenários:** percorrer a `/tv` inteira só com o controle da Smart TV e só
  com o teclado do PC. Nenhum elemento interativo inalcançável, nenhum foco perdido ao
  desabilitar as setas de borda, nada cortado pelo overscan.
- **`manual_order`:** reordenar pelo arrasto e pelas setas, forçar recálculo do rodízio e
  conferir que a ordem manual sobrevive; "voltar ao rodízio" devolve o item à regra.
- **Permissão:** convidado tenta remover música de outro e o **servidor** recusa (não só a UI).
- **PIN na TV:** destrava, expira em 5 min de inatividade, e o rate limit segura tentativa em
  sequência.
- **Nome:** vazio, só espaços, 1 caractere, 21 caracteres e nome repetido — todos tratados.
- **Ad-free, na etapa 1:** tocar um vídeo no IFrame, no navegador que vai ser o PLAYER,
  logado na conta Premium. Se vier anúncio, a premissa caiu no dia 1 e ainda dá tempo de
  redesenhar — não na véspera da festa.
- **Visual via CDP:** Chrome for Testing do cache
  (`~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome`, `--headless=new --no-sandbox
  --remote-debugging-port=N`) — o MCP do Playwright não funciona nesta máquina.

---

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| `ytmusic-api` é não-oficial | busca morre | Fallback oficial automático + aviso no `/host`. Camada isolada atrás de uma interface. |
| Firewall Hyper-V | **projeto não funciona** | Fase 0, antes de qualquer código |
| Overlay sobre o player | violação de ToS | Fundo = thumbnail desfocada; lista sobre o fundo, nunca sobre o player. No karaokê o player encolhe em vez de ser coberto. |
| Bibliotecas de navegação espacial abandonadas (todas de 2022) | retrabalho de UI na TV | Navegação escrita à mão; a superfície interativa da `/tv` é pequena |
| `nuxt-quasar-ui` tem um mantenedor só | integração trava num Nuxt futuro | Quasar não é usado na `/tv`, e o resto são ~6 primitivas — substituíveis sem reescrever o app |
| Modo admin aberto numa TV pública | convidado reordena a fila dos outros | Expira em 5 min, indicador visível, rate limit e validação no servidor |
| Overscan da TV corta os controles | botão inalcançável | Safe area de 5% em cada borda |
| Vídeo não-embeddable | festa trava | `videos.list` valida `status.embeddable` **antes** de enfileirar; `onError` 101/150 pula e tenta o próximo |
| Karaokê de baixa qualidade | experiência ruim | Mirar a seção Vídeos, duas grafias, e deixar o convidado escolher entre os resultados |
| Anúncio apesar do Premium | **premissa central cai** | Spike na etapa 1, não na 6. Domínio padrão, nunca `youtube-nocookie.com`; cookies de terceiros liberados para `youtube.com`; perfil normal e logado. Se cair, a biblioteca local vira o caminho principal. |
| IP da LAN muda no DHCP | QR impresso morre | QR gerado em runtime; reserva de DHCP no roteador é o conserto definitivo |
| Acento em `QRokê` vazando para contexto técnico | caminho ou URL quebrado | Regra fixada na seção **Nome**: `qroke` em diretório, pacote, hostname e repositório |

## Integração futura — Spotify Premium via Spotify Connect

**Status: planejada, ainda não implementada.** Registrada em 30/09/2026 a pedido do usuário.

**Objetivo:** continuar ouvindo no mesmo celular ao sair da aba do QRokê ou bloquear a tela.
O aplicativo oficial do Spotify será responsável pelo áudio; o QRokê organizará a festa e
controlará o dispositivo por Spotify Connect. A VPS coordenará a fila e os comandos, sem
capturar, armazenar ou retransmitir o áudio do Spotify. A PWA não será o motor de reprodução
deste fluxo.

### Etapas pendentes

- [ ] Validar primeiro o acesso à API com uma conta Spotify Premium e um aplicativo de
  desenvolvimento. Conferir novamente os limites e as regras antes da implementação.
- [ ] Implementar OAuth no domínio qroke.com.br, com permissões mínimas para consultar e
  controlar a reprodução. Guardar tokens cifrados no servidor, vinculados ao usuário e à
  festa; tratar renovação, revogação, desconexão e encerramento da sessão.
- [ ] Acrescentar o adaptador Spotify e a modalidade de reprodução por Connect à arquitetura
  de [plataformas e canais](media-platforms.md), usando rotas
  /api/f/:partyId/media/spotify/... e o canal music. Habilitar a opção somente após validar
  o fluxo completo.
- [ ] Permitir ao anfitrião conectar sua conta Premium, listar dispositivos e escolher o
  aplicativo Spotify do próprio celular ou outro dispositivo compatível. Orientar a abrir
  o Spotify quando nenhum dispositivo estiver disponível.
- [ ] Coordenar avanço, pausa, retomada, posição e troca de faixa no servidor, inclusive
  quando nenhuma aba do QRokê estiver ativa. Garantir uma coordenação por festa entre
  réplicas, sem comandos duplicados após reconexão ou reinício.
- [ ] Tratar dispositivo indisponível, controle feito fora do QRokê, token vencido, limite da
  API e tentativa de usar a mesma conta em festas simultâneas. Definir a transição entre
  Spotify e YouTube/biblioteca sem presumir que toda fonte oferece as mesmas capacidades.
- [ ] Validar o protótipo em celulares reais e, separadamente, a elegibilidade da integração
  para acesso público antes de habilitá-la para todos.

### Critérios de aceite

No Android e no iPhone, com Spotify instalado e a conta/dispositivo autorizados: iniciar
a reprodução pelo QRokê, trocar de aplicativo e bloquear a tela; pelo menos três músicas
devem avançar pela fila sem depender de uma aba aberta. Ao voltar ao QRokê, música, posição
e controles devem refletir a reprodução real. Testar também reconexão, troca de aparelho,
isolamento entre festas e recuperação do servidor sem duplicar comandos.

### Dependências e limites

As regras consultadas em 30/09/2026 limitam aplicativos Spotify em desenvolvimento a
5 contas autenticadas previamente autorizadas, com Premium exigido para o dono do aplicativo;
as APIs de controle de reprodução também exigem Premium do usuário. A expansão para o
público depende da elegibilidade e aprovação do Spotify. Não considerar esse acesso aprovado
apenas porque o protótipo funcionou.

YouTube Premium continua sem habilitar reprodução em segundo plano no player incorporado
do QRokê. Esta entrega futura é específica do Spotify; não representa retransmissão do
YouTube pela VPS, nem conclusão de uma integração com Deezer.

Referências oficiais para revalidar ao iniciar:
[controle e transferência de reprodução](https://developer.spotify.com/documentation/web-api/reference/transfer-a-users-playback),
[limites e aprovação da API](https://developer.spotify.com/documentation/web-api/concepts/quota-modes),
[políticas do Spotify](https://developer.spotify.com/policy) e
[regras do player do YouTube](https://developers.google.com/youtube/terms/developer-policies#i-additional-prohibitions).

---

## Roadmap — depois da v1

Spotify (busca e playback, exige Premium do dono do app) · Deezer como catálogo complementar ·
OAuth para playlists pessoais do YT Music · PWA instalável com HTTPS (domínio + Let's Encrypt
DNS-01) · votação para pular · histórico e estatística da festa.

**Fora de escopo, sem previsão:** extração de áudio do YouTube (ripping) e acesso de fora de casa.
