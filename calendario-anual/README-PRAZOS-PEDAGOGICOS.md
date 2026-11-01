# Prazos das avaliações — Gestão e Equipe Pedagógica

## Fonte da base de 2026

Dados transcritos de dois comunicados do Colégio Cora Coralina (entrega das avaliações e calendário de atividades — 2026). Este módulo **não modifica o PDF oficial original**.

| Etapa | Entrega na coordenação | Entrega de provas |
|---|---|---|
| 1ª | 05/01/2026 | AP2 e AD |
| 2ª | 06/03/2026 | AP2, AD e recomposição do 1º semestre |
| 3ª | 29/06/2026 | AD |
| 4ª | 28/08/2026 | AP2, AD e recomposição do 2º semestre |

**E-mails:** Ensino Fundamental, incluindo anos iniciais e finais: coordenacaofundamentalcora@gmail.com. Ensino Médio: coordenacaomediocora@gmail.com.

As janelas das avaliações são registradas separadamente, com datas de início e fim, conforme o comunicado enviado.

## Como usar

1. Na **Gestão**, selecionar o ano letivo e abrir **Entregas e avaliações integradas**.
2. Conferir e editar os quatro prazos de entrega e as janelas AP2, AD, AR.
3. Selecionar **Salvar rascunho** e **Validar datas e liberar para publicação**. Datas não aprovadas não entram no calendário publicado.
4. Usar **Publicar para equipe** na barra de Gestão. Só então os registros aprovados são compartilhados.
5. A **Equipe Pedagógica** acessa a aba **Prazos de entrega**, vê os e-mails e recebe alertas no sino quando falta até cinco dias para a entrega. Com a permissão de notificações ativa, o aplicativo também tenta uma notificação local ao ser aberto dentro dessa janela.

Os prazos aprovados aparecem no calendário mensal da Gestão; para 2026, apenas as entregas são adicionadas para evitar duplicação das janelas já constantes do calendário oficial. Para 2027 em diante, o módulo adiciona também o início e o fim das avaliações.

## Migração 2027

- Selecionar 2027, ajustar os períodos na seção **Etapas letivas**, e importar 2026 apenas como **rascunho**.
- O algoritmo propõe a posição equivalente no mês preservando o dia da semana e a duração das janelas, mas não confirma feriados, recessos ou dias letivos.
- Checar os alertas do painel: finais de semana, feriados estaduais/nacionais, janelas fora das etapas, e impactos da Copa Feminina 2027.
- Fortaleza é cidade-sede da Copa Feminina de 24/06 a 25/07/2027. O Parecer CNE/CEB 7/2026, homologado pelo MEC, requer considerar os impactos locais no calendário letivo.
- Respeitar o art. 24 da Lei 9.394/1996: **mínimo de 200 dias efetivos de trabalho escolar**, além da carga horária por etapa. O app não dispõe, por si, de frequência ou marcação completa dos dias de efetivo trabalho para comprovar automaticamente o mínimo.

**Divergências conhecidas em 2026 a revisar:** o comunicado das atividades registra início da 4ª etapa em 28/10, mas a base de períodos atual do aplicativo traz 05/10; a AP2 da 4ª etapa aparece de 26/10 a 30/10 e a AD da 3ª etapa de 28/09 a 02/10, ultrapassando a data final da etapa informada. Os dados não foram corrigidos silenciosamente.

## Limitações de envio

O sino da Equipe e as notificações locais usam o prazo publicado, não executam uma tarefa no aparelho fechado. O agendador Netlify `cora-reminders` verifica os prazos publicados duas vezes por hora e agenda um **Web Push exatamente cinco dias corridos antes, por volta das 9h no horário de Fortaleza**, com deduplicação. A entrega no app fechado depende de o professor ter ativado as notificações, de haver um registro Web Push válido e do serviço de notificações do aparelho. Esse envio deve ser validado após deploy em produção; não é possível garantir que cada aparelho o receba. Não há envio automático de e-mails nem confirmação individual de recebimento de provas nesta versão.

## Fontes gerais

- LDB: https://www2.camara.leg.br/legin/fed/lei/1996/lei-9394-20-dezembro-1996-362578-normaatualizada-pl.html
- Parecer homologado: https://agenciagov.ebc.com.br/noticias/202609/mec-homologa-parecer-sobre-ano-letivo-na-copa-feminina
