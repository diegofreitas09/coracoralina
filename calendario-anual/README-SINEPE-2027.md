# Fonte de referência: SINEPE-CE, sugestão de calendário escolar de 2027

Origem: PDF enviado à Gestão com o nome **“(2027) CALENDÁRIO ESCOLAR Atualizado Copa Feminina.pdf”**, página 1. Documento marcado “Sugestão”, apreciado pela Diretoria em 11/05/2026, aprovado em assembleia em 25/05/2026 e ajustado à Lei 15.421/2026. O PDF original não foi armazenado neste repositório.

| Etapa | Início | Fim | Dias previstos | Sábados previstos |
| --- | --- | --- | ---: | ---: |
| 1ª | 18/01/2027 | 02/04/2027 | 51 | 3 |
| 2ª | 05/04/2027 | 23/06/2027 | 59 | 3 |
| 3ª | 26/07/2027 | 01/10/2027 | 50 | 2 |
| 4ª | 04/10/2027 | 30/11/2027 | 40 | 2 |
| Total | | | 200 | 10 |

1º semestre = 110 dias (6 sábados). 2º semestre = 90 dias (4 sábados). Total de segunda a sexta apresentado: 190 dias. O PDF NÃO escolhe as dez datas específicas de sábado; elas são decisão da Gestão e não serão preenchidas automaticamente.

## Copa Feminina 2027

O PDF prevê pausa do fim da 2ª etapa (23/06) até o início da 3ª (26/07); Copa entre 24/06 e 25/07/2027. A Lei 15.421/2026, art. 67, e o Parecer CNE/CEB 7/2026 homologado em setembro de 2026 orientam a adequação do período escolar; a interpretação deve atender ao sistema de ensino e às peculiaridades do município.

## Datas e cuidados retirados do PDF

- 08 e 09/02: Carnaval (seg./ter.); 10/02: Cinzas, com observação no PDF sobre auxiliares administrativos até meio-dia.
- 19/03: São José; o PDF rotula “Feriado Estadual”, mas para Fortaleza a Lei 8.796/2003 o define **feriado municipal**. Essa divergência é registrada como correção jurídica, sem alterar o arquivo fonte.
- 25/03: Data Magna do Ceará (estadual) e Quinta-feira Santa (coincidência de datas em 2027). Evitar duplicar a mesma data ou contá-la duas vezes.
- 26/03: Paixão de Cristo. 27/05: Corpus Christi (municipal em Fortaleza).
- 11/08: Dia do Estudante, descrito como “feriado letivo” para docentes/discentes no modelo; observar a convenção aplicável.
- 15/08: Nossa Senhora da Assunção, feriado municipal em Fortaleza.
- 11/10: antecipação do Dia do Professor, também marcada “feriado letivo”; a situação trabalhista exige validação pela CCT.
- 12/10, 02/11, 15/11, 20/11 e 25/12: demais datas relacionadas no PDF.
- 25/05: Dia Nacional do Desporto Escolar (Lei 14.579/2023), com campanha/atividades na semana.
- Lista de materiais de 2027: a Lei CE 16.746/2018 prevê divulgação até **01/11/2026**, para instituições que exigem essa lista. Verificar comprovação.
- O PDF recomenda executar 55% do conteúdo no primeiro semestre. Isso é **recomendação**, não cômputo automático de carga horária.
- Horas curriculares são computadas em minutos totais divididos por 60, e não pelo número bruto de aulas menores que 60 minutos.

## Regras para desenvolvimento da plataforma

1. Fonte = **modelo de referência**; nunca declarar “calendário aprovado” pelo simples carregamento.
2. Ano 2026 permanece intacto; o modelo está restrito a 2027.
3. Etapas já validadas na Gestão não são sobrescritas. Etapas vazias ou importadas e ainda em revisão podem receber a sugestão mediante clique e confirmação.
4. Sábados são escolhidos explicitamente; só criar eventos **em revisão**, sem convocação de professores ou publicação automática.
5. Feriados municipais e decisões de funcionamento continuam no Gestor de Feriados, que considera UF e município.
6. A gestão deve verificar jornadas e a nova regra constitucional de dois dias de descanso com o RH/jurídico, a CCT de vigência correspondente e os acordos aplicáveis.
7. O PDF original não está embarcado no site; pode ser importado como documento por meio da Gestão, e o modelo derivado está codificado em `sinepe-2027.js`.

## Fontes normativas públicas conferidas
- Lei 15.421/2026: https://www2.camara.leg.br/legin/fed/lei/2026/lei-15421-1-junho-2026-799207-normaatualizada-pl.html
- Parecer homologado CNE/CEB 7/2026: https://agenciagov.ebc.com.br/noticias/202609/mec-homologa-parecer-sobre-ano-letivo-na-copa-feminina
- Lei municipal 8.796/2003: https://sapl.fortaleza.ce.leg.br/media/sapl/public/normajuridica/2003/3331/3331_texto_integral.pdf
- Lei CE 16.746/2018: https://www2.al.ce.gov.br/legislativo/legislacao5/leis2018/pl662018.pdf
