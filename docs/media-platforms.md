# Plataformas e canais de mídia

Cada festa conserva sua própria fila, player, convidados, credenciais e publicação de eventos.
“Canal” descreve a categoria da mídia (music, video, karaoke); “provider” identifica a
plataforma (youtube, local, spotify, deezer). A combinação não cria salas extras.

## Modelo e migração

O estado MongoDB usa schemaVersion 2. Cada faixa, inclusive no histórico, tem media:

```json
{
  "provider": "youtube",
  "externalId": "abcdefghijk",
  "channel": "music",
  "playback": { "kind": "youtube-embed" }
}
```

Os campos source e id continuam como aliases de compatibilidade para clientes e réplicas
anteriores. A identidade da faixa é (provider, externalId); nomes iguais ou IDs iguais entre
fontes não se confundem. O indicador karaoke prevalece sobre o canal informado.

A leitura normaliza estados anteriores. A próxima escrita transacional persiste a conversão;
não há exclusão de festas, filas, histórico ou credenciais. Novos itens são normalizados na
mesma transação da fila. Nenhuma URL temporária de streaming ou token entra no item público.

## Adaptadores e rotas

- Contrato: server/core/media-provider.ts.
- Catálogo de capacidades: shared/media.ts.
- Implementações: server/media/{youtube,local}.ts.
- Registro: server/utils/media-provider.ts.

Rotas canônicas com isolamento da festa:

| Rota                                                                               | Uso                                                  |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| /api/f/:partyId/media/providers                                                    | Fontes, capacidades e canais                         |
| /api/f/:partyId/media/:provider/search                                             | Busca com q e channel                                |
| /api/f/:partyId/media/:provider/stream/:id                                         | Áudio direto quando suportado; atualmente biblioteca |
| /api/f/:partyId/media/youtube/{status,connect,disconnect,playlists,preview,import} | Conta e playlists do YouTube                         |

As rotas legadas continuam como aliases. O callback Google cadastrado permanece
/api/youtube/callback, com o estado OAuth vinculando navegador e festa.
Rotas de streaming aplicam o mesmo acesso da festa e preservam requisições HTTP Range.

## Adicionar uma plataforma

1. Implementar um adaptador que retorne faixas normalizadas e valide a seleção no servidor.
2. Implementar OAuth e playlists nos caminhos da plataforma, usando credenciais criptografadas
   vinculadas à plataforma, ao usuário/navegador e à festa; nunca incluir tokens no estado público.
3. Integrar o mecanismo de reprodução autorizado à plataforma. Uma busca disponível não implica
   que exista uma URL de áudio para retransmissão.
4. Adicionar testes de isolamento, expiração, indisponibilidade, fila, controles e transferência.
5. Habilitar as capacidades no registro somente quando o fluxo completo estiver implementado.

YouTube e biblioteca estão ativos. Spotify e Deezer são entradas reservadas e retornam 501,
sem aparecer como opções funcionais na busca. Spotify exige uma integração própria com o
[Web Playback SDK / Spotify Connect](https://developer.spotify.com/documentation/web-playback-sdk);
Deezer depende do acesso e das capacidades autorizadas no seu portal. O servidor não extrai
nem retransmite áudio do iframe do YouTube.

## Continuidade e transferência

O player vive em PartyRuntime, fora das páginas. O iframe não é movido nem recriado ao abrir
menus ou trocar de rota dentro da mesma festa; apenas seu posicionamento visual muda.
Trocar de festa ou sair dela encerra o player.

Uma troca gera um ticket com origem, destino e faixa. O aparelho anterior destrói seu iframe
ou pausa o áudio antes de confirmar a posição. Apenas esse aparelho pode liberar a barreira.
A confirmação expira, só é aceita uma vez e não altera a posição de uma faixa diferente.
Sem confirmação, mantém-se a janela de nove segundos. Trocas encadeadas mantêm a proteção
contra um player anterior que ainda não confirmou sua parada.

## PWA

Manifesto standalone, convite de instalação, instruções para iPhone e service worker.
O cache contém apenas a página offline e ícones. APIs, OAuth, convites e páginas de festas
não são armazenados. Atualizações não forçam recarga durante a reprodução.
A instalação não altera as restrições de segundo plano do YouTube.
