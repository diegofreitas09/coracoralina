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