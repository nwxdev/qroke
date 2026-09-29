# QRoke em produção

Plano autorizado em 29/09/2026: MongoDB, Dragonfly, Docker Swarm e autodeploy existentes, https://qroke.com.br, sem homologação.

1. Persistência, concorrência e sessões compartilhadas.
2. Convites revogáveis e isolamento de festas.
3. Testes com dependências reais e duas instâncias.
4. Imagem, stack, secrets, backup e reversão.
5. Publicação e validação externa.

MongoDB é a autoridade da fila e do PLAYER. Dragonfly distribui avisos; reconexões recuperam o estado do banco. Expansão de capacidade não substitui redundância entre servidores.
