# Páginas legais e cadastro nas plataformas

Responsável informado: **RAFAEL VERGO POLAN AGENCIA DIGITAL**, CNPJ **47.049.695/0001-60**. Canal público: **contato@nwx.ag**. Versão dos textos: 1º de outubro de 2026.

| Campo                                        | URL pública                                  |
| -------------------------------------------- | -------------------------------------------- |
| Página inicial                               | https://qroke.com.br/                        |
| Termos de Serviço / Terms of Service URL     | https://qroke.com.br/termos-de-uso           |
| Política de Privacidade / Privacy Policy URL | https://qroke.com.br/politica-de-privacidade |
| Instruções de exclusão de dados              | https://qroke.com.br/exclusao-de-dados       |

As três páginas são HTML público, acessível sem login/convite, com canonical, título, descrição, cartão social e inclusão no sitemap. O rodapé público, a entrada e as telas da festa dão acesso aos documentos. Os formulários informam as condições antes da ação; aceitar o serviço não ativa o Analytics. O Analytics continua dependendo da escolha separada de medição e permanece restrito às páginas públicas.

## Google

No projeto correto, abra **Google Auth Platform → Branding** (ou a configuração da tela de consentimento OAuth) e preencha os campos de página inicial, privacidade e termos com as URLs acima. Mantenha `qroke.com.br` entre os domínios autorizados. A verificação de propriedade no Search Console já foi confirmada pelo responsável; não repita o DNS sem necessidade.

As páginas descrevem o acesso `youtube.readonly`, leitura de playlists, visibilidade dos itens adicionados à festa, desconexão local, revogação na Conta Google e canal de exclusão. Incluem os termos do YouTube, política Google e referência a uso limitado. Cadastrar essas URLs não equivale à aprovação OAuth ou à auditoria integral dos serviços YouTube. A chave de busca ainda tem a pendência separada da issue #19.

Antes de enviar uma verificação, validar o fluxo OAuth real, permissões e exclusão de dados: atualmente o comando Desconectar apaga a credencial local, mas não chama a revogação no Google; a política distingue essas ações. O requisito de revogação programática e limpeza dos dados autorizados precisa ser concluído no fluxo técnico antes de afirmar conformidade integral com as políticas do YouTube.

## Outras plataformas

Use os mesmos campos públicos de termos e privacidade quando cadastrar novas integrações. A URL de exclusão é uma **página de instruções por e-mail**, não um callback automático: não cadastrá-la em um campo que espere um endpoint de exclusão com assinatura/protocolo próprio. Facebook/Instagram ou outras integrações futuras podem exigir implementação e revisão específicas. O QRokê não solicita permissões dessas redes nesta versão.

No TikTok, verifique a propriedade das URLs no painel quando cadastrar o app, conforme o produto solicitado. Compartilhar um convite em WhatsApp, Telegram, Messenger ou Instagram não cria uma conexão de conta nem exige alegar uma integração inexistente.

## Operação pelo responsável

- [ ] **[VOCÊ · VALIDAR]** Confirmar que `contato@nwx.ag` recebe solicitações e terá atendimento; validar os textos e a identificação informada.
- [ ] **[VOCÊ · EXECUTAR]** Preencher as URLs no projeto Google correspondente e nas demais plataformas somente quando forem utilizadas.
- [ ] **[VOCÊ · EXECUTAR]** Atender pedidos de dados do YouTube tão logo possível, em até 7 dias corridos após a confirmação necessária para identificar os dados, conforme publicado; registrar resposta e eventuais exceções legais.

Os prazos das festas (24 horas de acesso e início da limpeza 24 horas depois), conexão OAuth (8 horas), prévias (5 minutos), cookie de navegador (30 dias) e cookies Analytics (180 dias renováveis) foram conferidos no código. Retenção administrativa do Analytics, registros de infraestrutura e atendimento não foram presumidos como apagados pelo encerramento da festa.

## Fontes oficiais consultadas

- [Branding e URLs do Google](https://support.google.com/cloud/answer/15549049?hl=pt-BR)
- [Políticas OAuth](https://developers.google.com/identity/protocols/oauth2/policies)
- [Políticas para clientes YouTube](https://developers.google.com/youtube/terms/developer-policies)
- [Dados de usuários das APIs Google](https://developers.google.com/terms/api-services-user-data-policy)
- [Cadastro e verificação de URLs no TikTok](https://developers.tiktok.com/docs/en/getting-started-create-an-app)
- [Direitos dos titulares — ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares)

A documentação da Meta não pôde ser lida nesta verificação (limite de requisições); conferir os campos e a documentação vigente ao cadastrar a integração. Estas páginas e instruções não representam aprovação por qualquer plataforma.
