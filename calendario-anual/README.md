# Calendário Anual 2026 — Colégio Cora Coralina

App estático, responsivo e instalável (PWA) para organizar o ano letivo de 2026.

## Recursos
- 12 meses com calendário navegável, eventos, categorias e observações.
- Importação múltipla/arrastar arquivos PDF, Word, Excel e imagens por mês.
- Sugestão automática de mês pelo nome do documento; opção de mover documento.
- Arquivos guardados localmente no navegador (IndexedDB). Eventos no localStorage.
- Exportação para **PDF completo com capa**, calendários de janeiro a dezembro, índice e conteúdo de arquivos PDF/imagens incorporados por mês.
- Word/Excel constam no índice e são baixáveis individualmente; não são convertidos/incorporados ao PDF sem um conversor adicional.
- Exportar/importar backup JSON completo (incluindo conteúdo dos documentos).

## Publicação via Netlify

Projeto sem processo de compilação. Diretório de publicação: `.` (raiz desta pasta); comando de build: nenhum.

Se estiver em `diegofreitas09/coracoralina` na subpasta `calendario-anual/`, configure no Netlify **Base directory:** `calendario-anual` e **Publish directory:** `.`. O arquivo `netlify.toml` está nessa pasta.

### Atenção à persistência
Os dados são locais ao navegador/dispositivo. Publicar no GitHub ou Netlify **não** sincroniza eventos/documentos entre usuários ou aparelhos. O backup JSON permite migração. Para multiusuário será necessário banco de dados + autenticação.

### Exportar PDF
A geração de arquivo PDF usa `pdf-lib@1.17.1` (distribuído pelo CDN jsDelivr) carregado ao clicar em “Baixar PDF completo”. Requer internet na primeira utilização. Se não conseguir carregar, é oferecida exportação por impressão (`Salvar como PDF`) do calendário com capa (sem anexos incorporados).

## Desenvolvimento local
Abrir `index.html` via servidor HTTP local, como `python -m http.server 8080`, e visitar `http://localhost:8080`. Não há dependências de build.


## Planejamento pedagógico e criador de cards (2026)

- **Planejamento de reunião:** seção `Planejamento pedagógico` permite escolher mês e segmento, registrar local, horário, coordenação, projetos, datas, pauta, orientações, encaminhamentos e aniversariantes. O PDF A4 é gerado no próprio navegador e não depende de serviços externos.
- O modelo inicial de **novembro de 2026** foi elaborado com base no documento fornecido pela coordenação; entradas com possíveis conflitos de datas devem ser revisadas antes de sua divulgação. Eventos cadastrados no calendário podem ser incluídos automaticamente, sem alterar o calendário original.
- **Criador de cards:** cinco modelos institucionais para comunicado, campanha solidária, reunião, cronograma de avaliações e 2ª chamada. Editor com prévia ao vivo e download **PNG 1080×1350** ou **PDF**.
- Campos e rascunhos dos dois novos módulos permanecem no **localStorage** deste navegador. O backup JSON (versão 3) também inclui essas informações e as restaura. **Não existe sincronização entre dispositivos**.
- Arquivos do estúdio: `studio.css`, `studio-assets.js`, `studio-pdf.js`, `planning.js`, `cards.js`.

### Publicação
Se o site Netlify for conectado ao repositório `diegofreitas09/coracoralina`, selecionar a branch `main`, diretório base `calendario-anual` e diretório de publicação `.`, sem comando de build.


## Logo oficial e calendário institucional de 2026

- Logo enviada pela escola incorporada à lateral do aplicativo, à capa do PDF completo e aos modelos do estúdio de cards (`school-brand.js`).
- **211 atividades oficiais de referência**, transcritas do documento escolar original (`official-calendar-data.js`). Eventos anteriores cadastrados no navegador são preservados e as atividades oficiais apenas são acrescentadas quando ainda não existem. Uma atividade oficial excluída não reaparece a cada abertura; há a opção de restaurá-la.
- Seção **Ver calendário oficial** para consultar a página visual original de cada mês (12 meses), com capa e página de anotações no botão **PDF oficial 2026**. As 14 páginas estão distribuídas em `official-page-01.js` a `official-page-14.js`, carregadas apenas quando utilizadas.
- O PDF oficial é uma **reprodução visual compactada** das 14 páginas do arquivo institucional enviado; não é uma extração de texto nem substitui o documento original de alta resolução. É gerado no navegador, sem depender de serviço externo.
- Fonte de referência: `CORA-CALENDÁRIO ANUAL-2026 (3).pdf` enviado pela escola. Para alterações posteriores da programação, conferência com a coordenação é indispensável. A Aula da Virada de novembro é um exemplo de divergência entre o calendário anual (10/11) e o planejamento específico (12/11).
- Os eventos oficiais também integram a geração de PDF completo da visão editável do aplicativo; o PDF original visual permanece disponível em botão separado.

## Gestão multianual (2024 em diante)

A tela principal contém um seletor de ano letivo. `year-manager.js` mantém cada ano separado, reaproveitando a estrutura do calendário oficial de 2026. A opção **Criar / copiar ano** permite escolher um ano de origem e criar outro sem sobrescrever o histórico. Há duas políticas de datas: manter dia/mês, ou preservar a posição do dia da semana para atividades, mantendo feriados fixos. Datas móveis, recessos, cronogramas de prova e reuniões **sempre exigem validação humana**.

Os dados de cada ano ficam em `localStorage` com chaves `cora_calendario_eventos_ANO_v1`, `cora_calendario_projetos_ANO_v1`, `cora_planejamento_ANO_v1`, `cora_cards_ANO_v1`, e em `IndexedDB` `cora_calendario_documentos_ANO_v1`. As chaves originais de 2026 foram preservadas para não perder dados existentes. Os registros oficiais de 2026 e seus projetos continuam em `official-calendar-data.js`; as imagens originais estão disponíveis apenas como referência histórica de 2026.

Todos os registros copiados para o novo ano começam **Em revisão**. Eles podem ser modificados individualmente e aprovados por mês, sem alterar o ano de origem. A visualização por Professores, Famílias e Planejamento é uma **prévia editorial**, não autenticação nem proteção de dados. Para sincronização real entre usuários/dispositivos, serão necessários autenticação, permissões por perfil, banco central e um fluxo de publicação.

`year-pdf.js` produz: (1) um panorama executivo dos 12 meses em uma página A4; (2) um PDF completo com uma página A4 para cada mês, com grade de dias, atividades e projetos; (3) cards-resumo por tipo/período em PNG/PDF. O PDF exibe um identificador derivado do conteúdo do ano por SHA-256 (quando disponível), útil para controle de versão, mas **não constitui assinatura digital certificada nem prova externa de autenticidade**. A antiga versão 2026 permanece como modelo histórico.

**Atenção:** backups e exportações são necessários porque ainda não existe publicação central. Não armazenar informações pessoais sensíveis de alunos em calendários ou documentos acessíveis publicamente. A assinatura do Google Agenda por URL existente cobre apenas o calendário oficial estático de 2026; os anos editados localmente exigem exportação .ics ou implantação futura de uma API de publicação.

## Notificações para professores e colaboradores

A interface do aplicativo disponibiliza **Avisos**, escolha de perfil e antecedência. Após autorização do aparelho, o app usa o Service Worker para lembretes **enquanto estiver aberto** (a cada minuto). Ao tocar no alerta, a página abre com o ano/mês correspondentes. Não disparar avisos sobre itens "Em revisão".

**Push com aplicativo fechado:** os arquivos `netlify/functions/notifications-config.mjs`, `notifications-subscribe.mjs` e `notifications-dispatch.mjs` estão preparados para Web Push com VAPID, Netlify Blobs e uma rotina às 7h e às 18h (America/Fortaleza). No estágio atual, o Netlify **não disponibilizou permissão de gravação de variáveis de ambiente (403)** e os deploys API **não implantaram funções**. Logo, esta etapa NÃO está ativa em produção.

Para ativar posteriormente em um deploy com Functions: instalar dependências de `package.json`, gerar um par VAPID com uma ferramenta confiável (ex.: `npx web-push generate-vapid-keys`) e configurar com escopo `Functions` as variáveis `CORA_VAPID_PUBLIC_KEY` e `CORA_VAPID_PRIVATE_KEY` na configuração do projeto Netlify. Opcional: `CORA_VAPID_CONTACT` com um URL oficial ou e-mail válido. Nunca gravar a chave privada no repositório. Confirmar no painel Netlify a publicação das três funções e o agendamento antes de apresentar o push como operacional. A primeira fonte de eventos remotos é `push-events-2026.json`, com atividades públicas do calendário oficial de 2026; outros anos dependerão de um mecanismo de publicação central autorizado.

**Alternativa já utilizável:** a opção **Usar Google Agenda** orienta a assinatura do calendário oficial de 2026 ou a importação de um arquivo .ics dos outros anos, com lembretes configurados no próprio Google Agenda. Instalar a PWA não equivale, por si só, a autorizar notificações. No iPhone o Web Push requer adicionar o app à tela de início e aceitar o pedido de permissão.
