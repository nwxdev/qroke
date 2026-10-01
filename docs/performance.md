# Desempenho das páginas públicas

Diagnóstico inicial: [PageSpeed de 1º de outubro de 2026](https://pagespeed.web.dev/analysis/https-qroke-com-br/s1iw84n2ex?form_factor=desktop), desktop 80 e mobile 58; acessibilidade, boas práticas e SEO 100. No desktop: FCP 1,4 s, LCP 2,3 s, TBT 0 ms e CLS 0,036. São medidas de laboratório, não dados de usuários reais.

## Alterações

- Logos responsivas WebP de 240, 480 e 720 px. Fontes PNG originais preservadas para artes; os componentes usam os arquivos menores. A versão escura de 240 px ocupa cerca de 8 KB, contra 522 KB do PNG original.
- Fontes DM Sans e Manrope servidas localmente, com preload, `font-display: swap` e licenças OFL em `public/fonts`. Sem importação bloqueante de Google Fonts.
- Estilos Quasar limitados a QBtn, QInput, QToggle, dependências internas e utilitários; ícones SVG em lugar da fonte de ícones. Ao introduzir outro componente Quasar, acrescentar seus estilos e dependências em `app/assets/quasar.sass`.
- Runtime de festas, avisos e janela de convite carregados sob demanda; o convite deve abrir no primeiro clique mesmo quando seu pacote ainda não foi carregado.
- Conteúdo principal visível desde a primeira pintura; brilho anima a opacidade de uma camada com sombra fixa. O tema e a preferência por movimento reduzido continuam controlando os efeitos.
- Espaço reservado para a faixa de instalação durante a identificação do navegador.
- Cache de sete dias para imagens da marca e um ano para fontes com versão no nome; o cartão social mantém sua regra própria.
- Compressão gzip das páginas públicas e recursos de texto no proxy QRokê, configurada no repositório de infraestrutura. As rotas privadas, APIs e WebSocket não usam essa regra. A ativação valida saúde, compressão e redirecionamentos e restaura a configuração anterior em caso de falha.

## Verificação

Usar a versão compilada e os roteiros existentes de SEO, convites, temas, animações e Analytics. O SEO confere oito páginas públicas, inclusive os documentos legais, em larguras de 320 a 1440 px. Depois da publicação, conferir `Content-Encoding: gzip` e `Vary: Accept-Encoding`, cache dos arquivos e repetir o PageSpeed em mobile e desktop. Não trocar a medição real por uma estimativa de nota.
