# Contas individuais · Calendário Cora Coralina

## Por que este controle é necessário

A senha coletiva da Equipe Pedagógica não permite revogar apenas um ex-colaborador. Este módulo adiciona uma conta por e-mail, sessão própria, senha scrypt com salt, convite de ativação e revogação de sessão e notificações.

## Migração sem interrupção

1. Entre na **Gestão**, clique em **Acessos da equipe**.
2. Cadastre o nome completo, o e-mail institucional/pessoal autorizado, a função e o segmento do professor.
3. O servidor gera um convite de uso único, válido por sete dias, exibido somente para a Gestão. Copie e envie ao destinatário por um canal seguro; o sistema ainda **não envia e-mail automaticamente**.
4. A Gestão escolhe **Copiar link de ativação** (compartilhamento manual) ou **Preparar e-mail de convite** (abre o aplicativo de e-mail, **sem enviar automaticamente**). É necessário conferir o destinatário e tocar **Enviar**.
5. O professor abre o link, confere o e-mail e cria sua senha pessoal (mínimo de 10 caracteres, letras e números). Se não conseguir abrir o link, pode entrar em **Equipe Pedagógica → Primeiro acesso? Ativar convite** e colar o link inteiro ou o código.
6. O status muda de **Pendente/Aguardando ativação** para **Ativo** após a senha ser criada.
7. A Gestão verifica quantas contas aparecem como **Ativo**.
8. Depois de distribuir as credenciais, a Gestão clica em **Exigir login individual para todos**. O sistema exige pelo menos uma conta já ativada. **Este corte é irreversível pelo painel**, por segurança.
9. A partir daí, a senha coletiva não abre mais as publicações. Cada colaborador usa e-mail e senha pessoal.

## Bloqueio de desligados

- **Suspender** bloqueia imediatamente todas as sessões ainda abertas daquele colaborador.
- **Desativar** bloqueia a conta e remove os dispositivos inscritos em notificações push.
- **Reativar** muda para Pendente; em seguida, use **Reemitir convite** para o colaborador definir outra senha.
- **Reemitir convite** invalida a senha e sessões anteriores e gera um novo link pessoal.
- As autodeclarações de entrega ficam associadas ao registro individual no Netlify Blobs. O vínculo antigo por nome livre não foi importado automaticamente, pois não comprovava identidade.

## Planilha de referência

Arquivo existente **Cora Família - Avaliações e Atendimento**, nova aba **Acessos Calendário**:
https://docs.google.com/spreadsheets/d/1tnOgWrN04AMiK88lkCCePeP3iOJ0AHnbN_91SpK5kyA/edit

Campos: ID, nome, e-mail, perfil, segmento, situação, ativação, desligamento, último acesso, observações.

**Importante**: a planilha é uma lista administrativa, não o banco de autenticação. O servidor Netlify Blobs é a fonte do estado da conta. Alterar a situação diretamente na planilha **não bloqueia o acesso**; execute a ação no painel Gestão. Não registre senhas ou links de convite na planilha. Ainda não há sincronização automática de cadastros entre os dois sistemas.

## Limitações e cuidados

- O sistema não verifica automaticamente a titularidade do e-mail, pois não há serviço de envio/validação conectado. O botão de preparar e-mail abre o programa de mensagens do aparelho com uma mensagem pré-preenchida; o envio continua sendo uma ação da Gestão. A segurança do primeiro cadastro depende de a Gestão compartilhar o convite com o professor certo. Um convite recebido por outra pessoa permite ativar a conta. Não envie em grupos.
- A sessão expira em até 12 horas, mas a autorização é reavaliada em todas as requisições: suspensão/desativação invalida a sessão imediatamente. A checagem de notificações push também revalida conta e versão.
- Publicações dinâmicas permanecem atrás da API autenticada. Documentos já baixados, conteúdo público do site, conteúdos históricos de JavaScript e acessos em outros provedores (Classroom, SAE, planilhas Google) não são apagados nem revogados por este controle.
- Revise as permissões dos arquivos Google: se uma planilha estiver como “qualquer pessoa com link pode editar”, bloquear o Calendário não revoga essa permissão.
- Implantação requer teste de navegador com Gestão e um convite real; validações sintáticas não demonstram acesso ponta a ponta.

## Segurança operacional

O servidor armazena somente derivação de senha com scrypt e salt, nunca a senha legível. Convites são armazenados pelo hash e são de uso único. Erros de login têm mensagem genérica e tentativas incorretas causam bloqueio temporário.


## Histórico de login e atualização da planilha

A autenticação registra por colaborador: data de ativação, primeiro acesso monitorado, último login válido e quantidade de logins monitorados.

A ativação inicial conta como um acesso. Novos logins com e-mail e senha aumentam a contagem; recarregar o Calendário não conta novamente. A contagem é iniciada na implantação deste recurso, e não recupera os acessos anteriores.

### Planilha Cora Família

Na aba **Acessos Calendário**, foram acrescentadas K: Quantidade de acessos e L: Primeiro acesso monitorado. As colunas G (Ativação), I (Último acesso), K (Quantidade) e L (Primeiro acesso) têm fórmulas que buscam dados da aba **Auditoria de Logins**, usando o e-mail em C como chave.

**Sem sincronização automática neste momento.** O Netlify ainda não possui uma autorização configurada para escrever no Google Sheets. A Gestão mostra números do servidor; a transferência para a planilha exige uma ação manual.

Para atualizar:

1. Entre em **Gestão → Acessos da equipe**.
2. Clique em **Copiar relatório para planilha**.
3. No Google Sheets, abra a aba **Auditoria de Logins**, selecione A1 e cole. O conteúdo copiado preenche A:G.
4. Retorne à aba **Acessos Calendário**. As fórmulas atualizam automaticamente G, I, K e L pelo e-mail do professor.
5. Repita a operação quando desejar um novo retrato da auditoria.

Não compartilhe o relatório ou convites em grupos. Não armazene senhas no Sheets. A situação F é cadastral: para suspender ou desligar uma conta de verdade use a Gestão. Uma sincronização automática futura dependerá de credenciais e autorização Google configuradas para o servidor; nunca publique um token secreto no site.
