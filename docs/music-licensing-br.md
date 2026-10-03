# Análise de música licenciada para o QRokê no Brasil

Pesquisa realizada em 3 de outubro de 2026. Prioridade: músicas originais brasileiras, escolhidas pelos convidados, com reprodução contínua no aparelho anfitrião enquanto ele usa outros aplicativos ou bloqueia a tela. O karaokê terá interface própria do QRokê em uma etapa posterior.

**Recomendação:** levar Tuned Global e MassiveMusic à etapa de validação de catálogo e cotação. São os candidatos mais alinhados a um player próprio com gravações originais. Ainda não há evidência pública suficiente para escolher entre eles pelo repertório brasileiro ou calcular o custo total. KaraFun e Sunfly são alternativas para o futuro karaokê, principalmente com regravações. Feed.fm tem menor aderência ao requisito de hits brasileiros escolhidos livremente.

Este documento distingue catálogo anunciado, amostra efetivamente encontrada e catálogo contratualmente disponível. Apenas o último permite lançar o serviço. Nenhum fornecedor foi contratado ou contatado nesta pesquisa.

## O produto que deve orientar a contratação

O modo música precisa de busca, seleção de faixas específicas, fila colaborativa e um fluxo de áudio por festa. O anfitrião reproduz; os convidados enviam pedidos. O contrato deve permitir esse uso sob a marca QRokê, no Brasil, com o modelo de cobrança pretendido.

O modo karaokê pode usar HTML, animações e controles próprios. Entretanto, exibir letras e sincronizá-las com uma gravação acrescenta direitos e custos que devem ser tratados separadamente. Transcrever a letra internamente não elimina essa necessidade.

Para começar, recomendo cotar somente áudio no Brasil e pedir letras, karaokê e novos territórios como opções adicionais. Isso permite medir o custo da funcionalidade prioritária sem condicionar o lançamento a todo o karaokê.

## Comparação dos fornecedores

| Fornecedor                          | Gravação e oferta                                                               | Evidência sobre repertório brasileiro                                                                       | Adequação ao QRokê                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Tuned Global                        | Infraestrutura de streaming e acesso a catálogos de gravadoras e distribuidores | Não encontrei lista pública auditável das faixas liberadas no Brasil para este produto                      | Candidato principal para música original                                      |
| MassiveMusic anteriormente 7digital | Busca, entrega de áudio e soluções de licenciamento                             | Disponibilidade depende dos contratos e territórios; falta uma exportação específica para o QRokê           | Candidato principal para música original                                      |
| Feed.fm                             | Catálogos comerciais por território, independentes e música funcional           | Brasil não consta nos territórios anunciados para Select; Global não comprova cobertura de hits brasileiros | Alternativa para catálogo independente ou programação curada                  |
| KaraFun                             | Catálogo de karaokê e oferta de integração empresarial                          | CSV público permite análise quantitativa de títulos em português                                            | Forte candidato a avaliar para karaokê; não substitui os fonogramas originais |
| Sunfly                              | Regravações de karaokê, áudio e letras sincronizadas                            | Há coleção brasileira verificável, mas não obtive inventário completo em português                          | Candidato a avaliar para karaokê                                              |

Fontes oficiais: [Tuned Global](https://solutions.tunedglobal.com/music-streaming-technology-for-dsps), [MassiveMusic](https://massivemusic.com/solutions/digital-platforms), [Feed.fm](https://docs.feed.fm/), [catálogo KaraFun](https://www.karafun.com/pt-br/karaoke-song-list.html) e [API Sunfly](https://api.sunflykaraoke.com/).

## Tuned Global

O fornecedor anuncia mais de 150 milhões de faixas e relações com majors, distribuidores e independentes. Também descreve caminhos de sublicenciamento com parceiros. Isso demonstra alcance potencial, mas não significa que a mensalidade da tecnologia autorize automaticamente todo esse catálogo. A própria página explica a necessidade de acordos com titulares. [Oferta para serviços de streaming](https://solutions.tunedglobal.com/music-streaming-technology-for-dsps).

Para o Brasil, ainda faltam evidências por faixa sobre sertanejo, pagode, forró, funk e lançamentos recentes. Não é possível afirmar, apenas pela presença de uma distribuidora, que um artista específico estará disponível no contrato do QRokê.

A validação deve usar o catálogo autorizado para o país e as condições de reprodução. A API considera contexto de país, dispositivo e autorização na emissão do acesso ao áudio. [Documentação de reprodução](https://docs.tunedglobal.com/api-docs/playback-and-queue/streaming-and-download/stream-token).

**Avaliação:** alta aderência técnica; cobertura brasileira e custo final pendentes. Solicitar proposta com tecnologia e direitos discriminados.

## MassiveMusic

A documentação confirma a continuidade da plataforma anteriormente chamada 7digital. A oferta cobre pesquisa, metadados, entrega de áudio e apoio ao licenciamento. [Documentação](https://docs.massivemusic.com/reference/introduction) e [soluções para plataformas](https://massivemusic.com/solutions/digital-platforms).

O caso Singa é especialmente relevante: demonstra fornecimento de gravações originais para uma plataforma de karaokê. Porém, o catálogo descrito acompanha os acordos da própria Singa com titulares; não é um pacote automaticamente disponível para outro cliente. [Caso Singa](https://massivemusic.com/cases/singa).

Há também um caminho de catálogo previamente negociado representado pela Songtradr. Convém cotá-lo como alternativa de entrada e compará-lo aos acordos para repertório de grandes gravadoras. Disponibilidade e território continuam sujeitos ao contrato. [Catálogo representado](https://docs.massivemusic.com/docs/accessing-the-represented-catalogue).

**Avaliação:** alta aderência ao projeto e precedente relevante para a evolução do karaokê. Falta comprovar a cobertura brasileira por ISRC, versão e direito de uso, além de obter preços.

## Feed fm

A documentação apresenta o Select em territórios que não incluem o Brasil; o catálogo Global de independentes tem alcance internacional. A página comercial anuncia mais de 150 mil faixas independentes, mas não discrimina quantas são brasileiras nem demonstra cobertura dos artistas prioritários. [Documentação](https://docs.feed.fm/) e [catálogo independente](https://www.feed.fm/indie-label-music).

Isso torna arriscado escolher Feed.fm apenas pelo tamanho do acervo. Uma estação de música latina também não comprova cobertura de sertanejo, pagode ou forró. A seleção livre de qualquer faixa deve ser confirmada no produto e contrato ofertados.

**Avaliação:** pode atender uma experiência curada ou um catálogo independente. Não é minha primeira escolha para uma festa em que os convidados esperam encontrar hits brasileiros específicos.

## KaraFun e o repertório em português

Analisei o CSV público obtido a partir da página oficial em 3 de outubro de 2026. O arquivo contém **89.589 registros com identificadores distintos**. Destes, **6.927 incluem português**, equivalentes a **7,73%** do total: 6.892 apenas em português e 35 multilíngues. [Página de download do catálogo](https://www.karafun.com/pt-br/karaoke-song-list.html).

Português não equivale a nacionalidade brasileira. O arquivo também não informa território autorizado, disponibilidade em contrato de integração ou uma separação de direitos por origem do conteúdo. Portanto, esses números medem o catálogo público consultado, não 6.927 faixas brasileiras já licenciadas para o QRokê.

A contagem abaixo busca nomes no campo de artista, desconsiderando maiúsculas e acentos. Colaborações podem entrar em mais de uma linha. Os valores são registros encontrados, não necessariamente composições únicas.

| Recorte         | Artista pesquisado  | Registros |
| --------------- | ------------------- | --------: |
| Sertanejo       | Marília Mendonça    |        61 |
| Sertanejo       | Henrique e Juliano  |        79 |
| Sertanejo       | Gusttavo Lima       |        81 |
| Sertanejo       | Luan Santana        |        59 |
| Sertanejo       | Jorge e Mateus      |         1 |
| Samba e pagode  | Zeca Pagodinho      |        33 |
| Samba e pagode  | Alcione             |        25 |
| Samba e pagode  | Thiaguinho          |        21 |
| Samba e pagode  | Ferrugem            |        15 |
| Samba e pagode  | Menos é Mais        |         2 |
| Forró e piseiro | Wesley Safadão      |        63 |
| Forró e piseiro | João Gomes          |         9 |
| Forró e piseiro | Barões da Pisadinha |        18 |
| Forró e piseiro | Nattan              |         4 |
| Pop e funk      | Anitta              |        21 |
| Pop e funk      | Ludmilla            |         7 |
| Pop e funk      | MC Hariel           |         0 |
| Pop e funk      | MC Ryan SP          |         0 |
| MPB e clássicos | Roberto Carlos      |       183 |
| MPB e clássicos | Gilberto Gil        |        18 |
| MPB e clássicos | Elis Regina         |        21 |
| MPB e clássicos | Tim Maia            |        25 |
| Rock            | Legião Urbana       |        35 |
| Rock            | Charlie Brown Jr    |        17 |
| Gospel          | Aline Barros        |        39 |
| Gospel          | Gabriela Rocha      |         9 |

**Leitura da amostra:** há profundidade em artistas tradicionais e parte do sertanejo. A cobertura dos nomes pesquisados é desigual, inclusive dentro do mesmo gênero. Zero significa ausência sob o nome buscado nesse arquivo; não comprova indisponibilidade absoluta no serviço.

Entre os registros em português, 112 têm o campo de ano entre 2024 e 2026. Esse é um indicador de catálogo que precisa ser conferido com lançamentos de referência; não mede participação no mercado ou cobertura das paradas. Datas de inclusão recentes também não significam músicas recém-lançadas.

O serviço informa que utiliza regravações para karaokê. Assim, mesmo uma excelente cobertura não resolveria a preferência por ouvir as gravações originais no modo música. [Informação do catálogo](https://www.karafun.com/pt-br/karaoke/).

## Sunfly e o repertório brasileiro

A API anuncia mais de 20 mil gravações de karaokê em 11 idiomas, incluindo português, e oferece áudio com letras sincronizadas ou vídeo. São gravações produzidas para karaokê. [API e formatos](https://api.sunflykaraoke.com/).

Encontrei uma coleção brasileira com 20 faixas e exemplos reconhecíveis: Como Nossos Pais, Trem das Onze, Fio de Cabelo, Show das Poderosas, Fui Fiel e Tudo Que Você Quiser. Essa é uma amostra concreta de variedade, mas não uma auditoria do acervo total, dos lançamentos ou das faixas liberadas pela API no Brasil. [Sound of Brazil volume 1](https://www.sunflykaraoke.com/discs/sound-of-brazil-vol-1/).

**Avaliação:** os formatos de áudio e letras combinam com a futura interface HTML. Antes de escolher, é necessário obter a lista completa em português e medir lacunas frente ao repertório pedido pelos usuários.

## Preços encontrados e o que eles compram

Valores consultados em 3 de outubro de 2026, nas moedas anunciadas, sem conversão cambial. Assinatura de um aplicativo e contrato para integrar seu conteúdo são produtos diferentes.

| Fornecedor ou produto          | Preço público encontrado                                                                                                                                                    | Implicação para o QRokê                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Tuned Global                   | Não há tabela pública completa. O formulário oferece faixas de orçamento de tecnologia abaixo de US$ 2.500 por mês até acima de US$ 15.000 por mês, excluindo licenciamento | São opções de qualificação comercial, não preço, mínimo obrigatório ou proposta                  |
| MassiveMusic                   | Sob consulta                                                                                                                                                                | Solicitar tecnologia, direitos, mínimos, tráfego e implantação discriminados                     |
| Feed.fm Instill                | A partir de US$ 500 por mês e compromisso mínimo de 3 meses; valor depende de público e volume                                                                              | Preço de uma oferta específica; não comprova acesso a hits brasileiros ou enquadramento do QRokê |
| KaraFun Premium                | R$ 22,90 por mês na página brasileira consultada                                                                                                                            | Uso do aplicativo; não é licença de integração                                                   |
| KaraFun Pro                    | R$ 109,90 por mês na página brasileira consultada                                                                                                                           | Plano do aplicativo para uso profissional; não substitui contrato de integração                  |
| KaraFun integração empresarial | Sob consulta                                                                                                                                                                | É a proposta relevante para incorporar o catálogo ao QRokê                                       |
| Sunfly API                     | Sob consulta, com modelos por estabelecimento, cliente ou volume                                                                                                            | Necessário definir qual modelo corresponde às festas do QRokê                                    |
| Sunfly coleção brasileira      | £ 9,95 na oferta de varejo consultada                                                                                                                                       | Compra do produto de varejo não equivale a licença para redistribuição por API                   |

Fontes: [formulário Tuned Global](https://www.tunedglobal.com/contact), [MassiveMusic](https://massivemusic.com/solutions/digital-platforms), [Feed.fm Instill](https://www.feed.fm/instill), [assinaturas KaraFun](https://www.karafun.com/pt-br/subscribe.html), [KaraFun Pro](https://www.karafun.com/pt-br/pro/), [integrações KaraFun](https://business.karafun.com/api-integrations), [API Sunfly](https://api.sunflykaraoke.com/) e [coleção Sunfly](https://www.sunflykaraoke.com/discs/sound-of-brazil-vol-1/).

Não encontrei uma oferta pública que permita prometer todo o repertório brasileiro original, reprodução sob demanda e uso comercial no QRokê por uma mensalidade fixa baixa.

## Apple Music como alternativa vinculada ao usuário

O plano individual brasileiro custa R$ 23,90 por mês na página consultada. MusicKit oferece integração de busca e reprodução vinculada à assinatura do usuário. [Apple Music Brasil](https://www.apple.com/br/apple-music/) e [MusicKit](https://developer.apple.com/musickit/).

Pode ser uma possibilidade para uma experiência pessoal, sujeita aos termos aplicáveis. Não fornece uma licença geral de catálogo para um serviço comercial de festas: o contrato impõe restrições à cobrança pelo acesso e à modificação ou sincronização do conteúdo. Por isso não deve ser tratado como uma substituição automática das propostas empresariais. [Contrato do programa de desenvolvedores](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/).

No modelo empresarial proposto, a ideia é autenticar o anfitrião no QRokê e usar a autorização contratada pelo serviço. O contrato deve confirmar esse fluxo, a participação de convidados sem conta no fornecedor e a ausência ou presença de publicidade.

## Modelo de custo e escala

O custo deve ser calculado por uso real e pelo modelo de licença, não apenas pelo número de pessoas presentes. Uma festa com 50 convidados e um aparelho tocando produz um fluxo de áudio; isso não impede que um fornecedor cobre também por usuários, estabelecimentos ou receita.

Cenários de planejamento, sem valores de royalties presumidos: quatro horas de áudio por festa, faixa média de quatro minutos e áudio a 160 kbps. Tráfego em GB decimais, antes de overhead e repetições.

| Festas por mês | Horas de áudio | Reproduções completas estimadas | Tráfego estimado |
| -------------: | -------------: | ------------------------------: | ---------------: |
|            100 |            400 |                           6.000 |          28,8 GB |
|            500 |          2.000 |                          30.000 |           144 GB |
|          1.000 |          4.000 |                          60.000 |           288 GB |

Uma proposta deve separar: implantação, mensalidade da plataforma, remuneração dos titulares, mínimo garantido, eventuais excedentes, tráfego, letras e impostos. O contrato pode combinar mínimo, uso e participação na receita; não se deve somá-los mecanicamente quando o mínimo for compensável.

Exemplo exclusivamente matemático: um custo fixo hipotético de US$ 2.500 por mês representa US$ 25 por festa com 100 festas, US$ 5 com 500 e US$ 2,50 com 1.000. Isso exclui todos os custos variáveis e não é uma cotação de fornecedor.

A arquitetura pode crescer com o número de aparelhos anfitriões. Já a viabilidade econômica depende do mínimo contratado e da receita por festa. A expansão internacional exige autorização por território e nova análise de repertório; não decorre apenas de o catálogo ser chamado global.

## Reprodução em segundo plano

A contratação deve permitir entregar áudio ao player do QRokê. Isso remove a dependência do iframe do YouTube, mas ainda é necessário implementar e testar o ciclo de reprodução de cada sistema.

Para o site e PWA, usar um elemento de áudio persistente, fila independente das animações e integração com Media Session para metadados e controles. Media Session não é garantia de que o sistema mantenha a aplicação executando. [Documentação da API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API).

Para a promessa de usar o celular durante uma festa, recomendo avaliar um aplicativo com camada nativa de reprodução: serviço de mídia no Android e configuração de áudio em segundo plano no iOS. Uma simples embalagem WebView não equivale a essa implementação. [Android](https://developer.android.com/media/media3/session/background-playback) e [Apple](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/MediaPlaybackGuide/Contents/Resources/en.lproj/ConfiguringAudioSettings/ConfiguringAudioSettings.html).

Critério de aceitação proposto: sessões reais de pelo menos quatro horas, incluindo transição entre faixas com tela bloqueada, troca de aplicativos, Bluetooth, chamada telefônica, perda e retorno da rede e modo de economia de bateria. Android, iPhone e PWA precisam de resultados separados. Esta pesquisa não testou fluxos licenciados desses fornecedores em aparelhos físicos.

## Letras sincronizadas e interface própria

Podemos construir a experiência visual, o contador fixo e as animações do QRokê. Os tempos devem acompanhar a posição real do áudio. Ao voltar para a tela, a interface deve se reposicionar pela música atual, sem depender de um contador acumulado durante o período oculto.

A letra e sua apresentação precisam de autorização compatível. No Brasil, a Lei 9.610 trata reprodução e transformação como modalidades de utilização sujeitas a autorização e estabelece que autorizações para modalidades diferentes são independentes. Portanto, transcrever com IA não cria o direito de publicar a letra. [Artigos 29 e 31](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm).

LyricFind oferece letras estáticas e sincronizadas por linha ou palavra. É um candidato para cotação complementar, mas não encontrei preço público ou cobertura brasileira quantitativa suficiente para estimar o custo do QRokê. A proposta deve confirmar o uso específico de karaokê. [Lyric Display](https://www.lyricfind.com/products/lyric-display).

Se o contrato permitir transcrição e processamento, o fluxo pode alinhar texto autorizado ao áudio, revisar manualmente os tempos e associar tudo à gravação exata. Versões ao vivo, de estúdio e remixes não compartilham necessariamente o mesmo tempo. Exibir a letra com o vocal original é uma experiência de cantar junto; remover vocais ou fornecer acompanhamento exige uma solução e autorização adicionais.

O ECAD informa que sua licença digital se refere à execução pública e que outros direitos devem ser tratados com os titulares. O enquadramento do serviço digital e das festas ou estabelecimentos precisa ser confirmado, sem presumir que uma única mensalidade cubra tudo. [Orientação oficial do ECAD](https://www4.ecad.org.br/servicos-digitais-informacoes-gerais/).

## Como escolher pelo repertório brasileiro

Antes de contratar, recomendo uma lista de 100 músicas que represente o uso esperado: 25 de sertanejo, 20 de samba e pagode, 15 de forró e piseiro, 15 de MPB e clássicos, 10 de rock, 10 de pop e funk e 5 de gospel. Essa distribuição é uma hipótese inicial de produto, a ajustar com os pedidos dos usuários.

Cada fornecedor deve devolver, para cada música, título, artista, ISRC, versão, disponibilidade no Brasil, direito de reprodução sob demanda e eventuais restrições. Para o futuro karaokê, adicionar disponibilidade de letra sincronizada e permissão de uso. A documentação da MassiveMusic exemplifica metadados úteis para essa verificação. [Metadados disponíveis](https://docs.massivemusic.com/docs/available-metadata).

A comparação deve medir correspondência exata com a gravação desejada, lançamentos recentes, clássicos de festa e cobertura por gênero. Um total global de milhões de faixas não substitui esse teste.

A lista de 100 faixas ainda não foi submetida aos fornecedores. A análise quantitativa concluída nesta pesquisa é a do CSV público do KaraFun; não foi possível realizar auditoria equivalente dos catálogos contratuais da Tuned Global e MassiveMusic sem acesso comercial.

## Escopo pronto para cotação

Solicitar às duas candidatas principais a mesma proposta: QRokê com marca e interface próprias, lançamento no Brasil, músicas originais sob demanda, pedidos dos convidados e um aparelho anfitrião reproduzindo por festa, inclusive em segundo plano.

Pedir três cenários mensais: 100, 500 e 1.000 festas de quatro horas; preços de implantação, tecnologia, direitos, mínimos, excedentes e tráfego; requisitos de prestação de contas; critérios de contabilização de reproduções; limites de simultaneidade; cobertura por país; prazo de contrato e condições de saída.

Exigir amostra de catálogo autorizada para o Brasil e teste das 100 músicas. Pedir letras e karaokê como opcionais, com autorização para sincronização e eventual processamento claramente descrita. Para expansão, solicitar condições separadas por território.

**Decisão recomendada:** começar pela validação comercial de Tuned Global e MassiveMusic para o modo música. Escolher somente após cruzar repertório brasileiro efetivamente autorizado, custo por festa e teste de reprodução em segundo plano. Manter KaraFun e Sunfly como uma decisão posterior para o karaokê.
