# Auditoria de integração — Gestão e Equipe Pedagógica

**Data:** 8 de novembro de 2026  
**Sistema:** Calendário Anual — Colégio Cora Coralina  
**Referência:** API de publicações autenticadas, frontend de Gestão, frontend de Equipe, calendário local, exportações e PWA.

## Situação comprovada

| Fluxo | Evidência | Situação |
|---|---|---|
| Gestão → API → Equipe | `cora-portal.mjs` grava e consulta publicação por ano, com login e permissão administrativa na publicação | Estrutura confirmada; teste com dois logins reais pendente |
| Calendário anual e mensal | `year-transfer.js`, `app.js`, `year-sync.js` e `portal.js` usam ano selecionado; painel compara aprovações locais com publicação remota | Verificação automatizada; estados de outros dispositivos não podem ser apagados pela auditoria |
| Carnaval 2027 | API e filtros da Gestão/Equipe retiram a duplicação 15, 16 e 17/02/2027; datas corretas 08, 09 e 10/02 | Correção em produção e regressão automatizada |
| Feriados entre anos | Datas móveis calculadas pela Páscoa; dados de feriados geridos não são importados como cópias do ano anterior | Corrigido e testado |
| Avaliações 2027 | Aprovações impedidas com provas fora da etapa ou durante 24/06 a 25/07/2027 | Bloqueio incorporado; cronograma real ainda depende de aprovação da Gestão |
| Datas de entrega | Campos de entregas existentes não são sobrescritos pela auditoria nem pela correção de Carnaval | Preservação garantida nos reparos desta versão |
| Projetos, aniversários e etapas | Publicação contém arrays e a auditoria os verifica, sinalizando dados ausentes ou duplicados | Verificação de estrutura; conferência de cadastros reais pendente |
| PDFs da Equipe | `calendar-pdf-activities.js`, `team-calendar-view.js` e `portal.js` utilizam eventos filtrados | Teste de dados; renderização em aparelho/impressão ainda pendente |
| Avisos e notificações push | Gestão publica avisos; Equipe reconsulta o servidor a cada 30 s com aplicativo aberto | Estrutura inspecionada; entrega push com app fechado requer teste no Android e iPhone |
| Login individual, acessos e Google Sheets | API contém autenticação, gestão de contas, métricas e integração de espelhamento | Requer teste autenticado e autorização do Google Sheets; não há garantia de espelho sem configuração |
| PWA e atualização no celular | Nova versão de cache e URLs atualizadas dos módulos | Teste de build; atualização do service worker em celulares antigos depende de atualização de página |

## Correções desta rodada

1. Criada **Auditoria das integrações** dentro da Gestão: consulta dados publicados e confronta com os eventos aprovados locais, avaliações, etapas, aniversários e calendário.
2. A auditoria reexecuta automaticamente quando há mudanças e, enquanto o painel está aberto, a cada três minutos. Se a API falhar, exibe **consulta indisponível** em vez de mostrar uma sincronização falsa.
3. Cópias locais **exatamente idênticas** podem ser removidas mediante confirmação e backup. Eventos diferentes, mesmo com ID repetido, exigem revisão administrativa.
4. Eventos encontrados apenas na publicação do servidor não são tratados como erro automaticamente; podem ter sido cadastrados em outro dispositivo e não devem ser excluídos sem conferência.
5. Importações anuais não copiam feriados gerenciados nem Simulado SAE; datas móveis são recalculadas. Importar avaliações 2026 → 2027 automaticamente foi bloqueado para evitar datas durante a Copa.
6. As avaliações de 2027 não podem ser aprovadas se saírem dos limites cadastrados da etapa ou coincidirem com o período de 24/06 a 25/07. **Datas de entrega são mantidas**.

## Pendências de implantação não disfarçadas como concluídas

O PR #50 continua em rascunho e inclui recursos que **não pertencem a esta correção de produção**: menus laterais, cartões das avaliações por etapa para a Equipe, Simulado SAE automático, planejamento ExpoCora e painel ampliado. A auditoria não presume que essas funcionalidades estejam ativadas na versão principal.

## Validação operacional necessária

1. Entrar na Gestão e na Equipe em dispositivos separados e no mesmo ano; conferir o horário da última publicação e as quantidades.
2. Fazer uma atualização controlada em ambiente de teste, validar e publicar; confirmar o recebimento pela Equipe sem duplicação em menos de um ciclo de sincronização.
3. Conferir um PDF anual e um PDF mensal no Android e no iPhone, incluindo páginas detalhadas e aniversariantes.
4. Testar notificação push em dois aparelhos autorizados com o aplicativo fechado, e limpeza do sino após leitura.
5. Conferir acesso, recuperação de senha e segmentos com contas de teste; checar o espelhamento para Google Sheets quando a integração estiver autorizada.

**Princípio de proteção:** a auditoria nunca faz uma publicação administrativa sozinha e não altera os prazos de entrega. O resultado dos testes automatizados não substitui uma verificação autenticada e visual em aparelhos reais.
