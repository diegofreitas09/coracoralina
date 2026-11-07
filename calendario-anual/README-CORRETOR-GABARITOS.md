# Corretor de Gabaritos · Equipe Pedagógica

Módulo da área **Equipe Pedagógica** do Calendário Anual Cora Coralina.

## Fluxo do professor
1. Entrar com a **conta individual** (o login coletivo não permite acesso aos dados privados).
2. Clicar em **Corretor de gabaritos** na barra de navegação ou em **Acesso rápido**.
3. **Nova avaliação**: nome, série, turma, disciplina, data, número de questões (1 a 60), 4/5 alternativas, valor da prova; indicar a alternativa correta de cada questão; salvar.
4. **Imprimir folha de respostas**: modelo A4 padronizado com quatro marcadores pretos. Os estudantes escrevem nome, data e número e preenchem uma alternativa por linha. A impressão não contém o gabarito oficial.
5. **Capturar novo gabarito**: fotografar com todos os quatro marcadores visíveis, sob boa luz, sem inclinação acentuada. **Ler marcações automaticamente** para decodificar as bolhas. **Ler cabeçalho (OCR)** para tentativa local de identificação; disponível mediante conexão para baixar o leitor Tesseract.js.
6. Revisar nome, número, data e todas as questões. Marcas duplas ou confusas ficam como **Revisar**, bloqueando o registro definitivo até correção manual. Itens sem marca são **Em branco**.
7. **Conferir e salvar correção**: servidor calcula acertos, erros, brancos, nota proporcional ao valor da prova (duas casas) e vincula ao teste e professor.
8. Exportar **CSV compatível com Excel** ou **Imprimir/Salvar em PDF** o relatório consolidado.

## Restrições importantes
- A detecção de bolhas funciona apenas para a **folha de respostas padronizada gerada pelo próprio aplicativo**. Outros modelos exigem preenchimento manual ou adaptação de layout.
- Nome manuscrito e número podem não ser reconhecidos corretamente pelo OCR; conferir é obrigatório.
- Fotografias são processadas apenas **no navegador**, não são gravadas na API. O OCR opcional carrega scripts e recursos de idioma de uma CDN, mas o arquivo da foto não é enviado ao servidor de OCR.
- As chaves e notas são persistidas no Netlify Blobs por ID autenticado, com verificação no backend. Não existe listagem pública ou consulta entre docentes.
- O armazenamento é adequado a uma primeira versão com edição sequencial. Para volumes grandes ou edições simultâneas, migrar para banco transacional.
- O navegador de impressão permite escolher “Salvar como PDF”. CSV pode ser aberto no Excel.
- Exclusões são confirmadas na tela e não podem ser desfeitas.
- A leitura de foto precisa de validação com impressões e smartphones reais antes do uso em larga escala.

## Testes automatizados executados
- Sintaxe JavaScript (frontend, backend, PWA).
- Armazenamento por professor, cálculo de 2/3 acertos (6,67/10), rejeição de registro ambíguo, recálculo após edição da chave, isolamento de professor A/B.
- Leitura de 10 questões com bolhas e quadrados de referência em imagem sintética, incluindo branco e A–E.

## Implantação
Os assets `grader.js` e `grader.css` são carregados antes de `portal.js`. O endpoint `/calendario-anual/api?action=gradebook` só permite GET/POST com sessão pessoal de membro da equipe; POST exige cabeçalho `x-cora-request: portal`. Os novos arquivos estão incluídos no cache de instalação PWA.
