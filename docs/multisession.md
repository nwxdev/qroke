# Festas simultâneas

## Uso

A página inicial permite criar uma festa sem cadastro: nome, PIN numérico de seis dígitos e confirmação. O criador entra no painel de anfitrião. Cada festa dura 24 horas a partir da criação; o anfitrião pode encerrá-la antes mediante confirmação. Encerramento é definitivo.

O link compartilhado e o QR Code incluem o identificador da festa e um convite aleatório. O PIN nunca faz parte do convite. Após aceitar, o segredo é retirado da URL. O convidado informa seu nome e participa daquela fila. Quem conhece o PIN pode solicitar os controles; a reserva de um anfitrião por vez é mantida.

“Suas festas” mostra somente festas ativas acessadas pelo navegador atual. Não há diretório público. Limpar os dados do navegador remove essa facilidade de retomada; um convite válido ou o PIN na URL da festa permite nova entrada. O PIN deve ser guardado pelo criador; não há recuperação por e-mail.

## Isolamento e persistência

- Páginas: /f/<id>, /f/<id>/busca, /host, /player, /qr e /tv.
- APIs: /api/f/<id>/...; /api/parties cria e lista os acessos do próprio navegador.
- MongoDB armazena a festa e suas datas, fila, votos, participantes, dispositivos, reservas e credenciais. Todas as consultas são delimitadas por organização e festa.
- Um cookie HttpOnly identifica o navegador. Cada associação à festa tem papel, validade e credenciais próprias; os tokens sensíveis são cifrados. O banco guarda somente o hash do segredo do navegador e do convite. O PIN usa scrypt com salt aleatório.
- Estado em memória do navegador, dispositivo, canal entre abas, avisos e player são separados por festa. Abas do mesmo navegador podem participar de festas diferentes.
- Dragonfly distribui eventos por festa e mantém limites compartilhados. Clientes recuperam o estado completo após reconexão; polling continua como alternativa ao WebSocket.
- A criação é idempotente por navegador e chave da solicitação. A publicação do convite cifrado e de seu hash acontece na mesma transação, evitando convites divergentes sob concorrência.

Os comandos sobre a festa são serializados por transação MongoDB. A validade é conferida ao iniciar e antes de concluir a operação; uma operação que atravessa o prazo é abortada. APIs devolvem 410 para uma festa encerrada. Os clientes interrompem o player no prazo calculado com o relógio do servidor, e conexões WebSocket são revalidadas periodicamente.

## Google e catálogo

O callback permanece único: https://qroke.com.br/api/youtube/callback. O estado OAuth cifrado vincula cada autorização ao navegador e à festa corretos, incluindo duas autorizações pendentes em abas diferentes. O retorno exige o mesmo navegador. Encerrar ou expirar a festa impede concluir a autorização.

Busca e catálogo podem usar cache comum. Contas Google, playlists privadas, tickets e importações permanecem isolados. O orçamento diário de buscas do YouTube continua global; limites por festa evitam que uma única festa concentre solicitações.

## Retenção e compatibilidade

As festas novas recebem purgeAt para 24 horas após o encerramento ou vencimento. A cada minuto, cada instância tenta limpar até 25 festas elegíveis. Dependências são removidas primeiro e o registro da festa por último, permitindo repetição após falha. Expiração de acesso não depende da limpeza nem do prazo do índice TTL.

A festa original permanece sem expiração automática, com o PIN global existente e sem exclusão automática. O navegador que ainda possui a sessão antiga pode importá-la ao abrir a página inicial. Cookies não são transportados entre domínios: após a troca de domínio, a entrada na festa original exige o PIN ou um novo convite.

Novas festas usam identificadores versionados com prefixo f1. O formato é recusado pelas antigas APIs de entrada, evitando que uma versão anterior conceda acesso às novas festas usando o PIN global durante uma atualização ou reversão. Reverter a imagem preserva o banco, mas desabilita o uso das festas novas até restaurar uma versão compatível.

## Publicação e validação

Não há homologação para este projeto. A entrega usa o CI/CD de produção existente após os testes locais e do PR. Concluir primeiro a migração HTTPS para qroke.com.br e a publicação de favicon/SEO. Depois publicar esta alteração, aguardar todas as réplicas convergirem e validar criação, QR, PIN, player, Google e encerramento no domínio.

Verificações automatizadas:

- Persistência real: concorrência entre instâncias, convite atômico, promoção sem rebaixamento, encerramento concorrente, expiração durante transação e limpeza que preserva o legado.
- API: duas festas no mesmo navegador, PIN próprio, idempotência, filas e OAuth independentes, revogação, reinício e bloqueio após expiração.
- Navegador: telas móvel e desktop, confirmação de PIN, “Suas festas”, abas simultâneas, QR, compartilhamento com fallback de cópia, fila, encerramento e expiração.
- Carga local reproduzível: npm run test:load abre dez festas, cadastra 20 convidados por festa e mantém 200 WebSockets em duas instâncias. O teste registra duração e p95 de entrada. Não mede mídia externa nem substitui medição na VPS.

Escalar horizontalmente exige o mesmo MongoDB, Dragonfly, segredos, relógios sincronizados e biblioteca de músicas locais compartilhada. As duas réplicas atuais ajudam na publicação e distribuição de conexões; a VPS, MongoDB e Dragonfly ainda precisam de redundância entre servidores para tolerar perda do host.
