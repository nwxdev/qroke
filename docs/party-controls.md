# Controle e isolamento das festas

## Acesso

Nas novas festas, o navegador que cria a festa recebe o papel de dono, sem digitar PIN. O nome informado também registra sua participação. Somente o dono concede ou revoga DJ em Dispositivos e encerra a festa. DJ pode administrar fila, convites, dispositivos e reprodução, mas não conceder DJ nem encerrar a festa. As permissões são verificadas no servidor, inclusive dentro das alterações transacionais. Festas antigas mantêm o fluxo de PIN existente; o campo indica seis dígitos.

Cada dispositivo pertence a uma festa e aparece com participante, papel e horário de conexão, em ordem decrescente. A escolha de onde tocar fica no painel do anfitrião. O player não oferece ativação de dispositivo. O navegador ainda pode exigir uma interação para liberar áudio; entrar em tela cheia também tenta liberar o som.

## Navegação e reprodução

O painel abre na fila, com abas Dispositivos, Player e Festa. No celular, a navegação fica no rodapé; no desktop, na lateral. As animações ficam habilitadas, respeitando a preferência de movimento reduzido do sistema. No karaokê em tela cheia, o QR Code apresenta a chamada discreta: “Seu próximo refrão começa aqui. Escaneie e escolha a música.”

A fila normal intercala participantes: após uma faixa da playlist, entra o pedido do outro participante e a playlist continua quando não há outro pedido. Prioridades de karaokê, votação e ordem manual continuam aplicáveis. A reordenação utiliza mapa e conjunto para evitar buscas repetidas. Playlists expandidas exibem capas e filtro local por título/artista; a prévia por link informa que o filtro se aplica ao lote carregado.

## Sugestões e PWA

As sugestões usam o catálogo musical, com atraso de 350 ms, cancelamento de requisições antigas, teclado e limite de oito opções. No karaokê, a consulta acrescenta o contexto de karaokê e remove prefixos repetidos na escolha. O cache compartilhado dura cinco minutos, falhas por trinta segundos, com trava curta para evitar consultas duplicadas entre instâncias. A busca manual continua disponível quando o provedor não responde.

O PWA tenta retomar a última festa autorizada quando o armazenamento é compartilhado. Para instalações com armazenamento separado, o usuário gera um código no menu ou na aba Festa e o cola em Vincular sessão. O código é aleatório, vale cinco minutos e uma utilização. A vinculação mantém permissões vivas da sessão original: revogar DJ ou convite também revoga o acesso correspondente no aparelho vinculado. Credenciais do Google não são copiadas.

## Expiração e segurança

A festa expira após 24 horas. A exclusão definitiva respeita a retenção existente de 24 horas após expiração ou encerramento. A limpeza começa na inicialização e repete a cada minuto, em lotes de 25. Remove os registros da festa no MongoDB e suas chaves de catálogo, presença e TV no Redis. O marcador da festa permanece quando a limpeza falha, permitindo nova tentativa. Chaves temporárias de limitação e vinculação expiram por TTL.

A suíte de segurança exercita duas festas e duas instâncias, acessos indevidos, credenciais de dispositivo fora do escopo, promoção indevida, revogação, códigos simultâneos e encerramento exclusivo do dono. A inspeção direta dos registros de produção depende de acesso ao servidor; testes locais de limpeza não comprovam que a base de produção já foi purgada.

A auditoria npm das dependências de produção não aponta vulnerabilidades conhecidas. Existem avisos no conjunto de ferramentas de build, incluindo dependências transitivas sem versão corrigida disponível na revisão. O runtime Docker copia apenas a saída de produção e executa sem root; DevTools fica desabilitado. Auditoria de dependências não é garantia de ausência de falhas.
