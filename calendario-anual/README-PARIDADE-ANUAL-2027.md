# Paridade dos calendários 2026–2099 · Colégio Cora Coralina

## Princípio
Todas as versões do calendário da Equipe Pedagógica devem oferecer a mesma **estrutura visual e funcional**, independentemente do ano: Visão Geral, calendário com grade do mês, panorama dos 12 meses, etapas, avaliações, prazos, aniversários e PDF anual/mensal.

A fonte de dados da Equipe é exclusivamente a **publicação aprovada pela Gestão** no ano letivo escolhido. Não copiar automaticamente datas escolares de 2026 para 2027 sem revisão. Feriados, avaliações e etapas podem mudar.

## O que a atualização exibe
- Visão Geral: painel de 12 meses com totais de atividades, avaliações, projetos e aniversariantes; panorama de etapas, atalhos, compromissos e avisos.
- Calendário: grade DOM de domingo a sábado com eventos aprovados, início/fim de etapas, aniversários e lista de projetos. Navegação por mês e resumo anual.
- Avaliações: calendário visual específico de provas, simulados e avaliações publicadas.
- Prazos: quatro cards de etapas mesmo quando a Gestão ainda não publicou datas; somente prazos efetivamente publicados permitem marcar como entregues.
- PDF Anual: 2026 mantém o documento oficial de referência; 2027 e seguintes têm prévia mensal do conteúdo publicado com botão para PDF do mês e dos 12 meses. A prévia pode ter paginação diferente do PDF.
- Anos futuros: listas e PDFs usam apenas a publicação do ano selecionado. Aniversariantes permanecem recorrentes.

## Publicar 2027
1. Na **Gestão**, selecione o ano de 2027.
2. Abra **Conferência dos 12 meses · Gestão e Equipe**.
3. Use **Importar estrutura do ano anterior** (se desejar aproveitar 2026). A importação mantém datas e eventos como **Em revisão**, para garantir controle pedagógico.
4. Revise cada data, abra o evento e altere seu status para **Publicado**. Confira separadamente as quatro etapas e cronogramas de avaliações.
5. Clique em **Publicar 2027 para equipe**. O painel mostra quais meses ainda possuem rascunhos e quais foram publicados.
6. Na **Equipe Pedagógica**, selecione 2027, clique em Atualizar e confira as abas do ano inteiro.

## Testes
- Sintaxe JS do helper, do portal e do service worker.
- Ano 2027 com eventos e prazos simulados: inserção na data correta, listagem do mês, estatísticas, aniversários, projetos e marcação da etapa.
- Ano 2028 sem publicação: estrutura visual preservada, sem atividades fictícias.
- HTML escapado para dados de usuário.
- Cache PWA atualizado para incluir os scripts/estilos.
- Testes finais de interface real, login autenticado e downloads em Android/iPhone continuam necessários. A ausência de dados locais na sessão de auditoria impede confirmar que todas as datas reais já foram aprovadas.
