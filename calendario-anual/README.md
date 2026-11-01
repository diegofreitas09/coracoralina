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