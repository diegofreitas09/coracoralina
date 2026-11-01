# Portal Cora Coralina – Gestão e Equipe Pedagógica

## Publicado

- Mesmo caminho do calendário de 2026: `/calendario-anual/`.
- Interface de dois perfis: **Gestão** (edita rascunhos e publica) e **Equipe Pedagógica** (consulta somente publicações).
- Visão da equipe: calendário de eventos, avaliações e simulados, avisos, histórico visual do PDF anual, download do PDF oficial, sino de alertas e atualização a cada 90 segundos enquanto a página estiver aberta.
- Gestão: cadastro de comunicados, data de publicação, opção de data do evento e antecedência, revisão e botão de publicação explícita.
- Backend com sessão assinada em cookie HttpOnly, duas permissões, senhas exclusivamente em variáveis de ambiente; dados publicados em Netlify Blobs.

## CONFIGURAÇÃO NECESSÁRIA NO NETLIFY

A conexão do ChatGPT para modificar as variáveis protegidas do Netlify respondeu **403 Forbidden**. Por isso, o portal **não substitui ainda o painel de gestão existente** e mostra um aviso discreto de configuração pendente. A API está implantada, mas retorna HTTP 503 até configurar estes três valores em Netlify > projeto `calendario-anual-cora-2026` > Project configuration > Environment variables:

- `CORA_GESTAO_PASSWORD` – senha definida para a Gestão.
- `CORA_EQUIPE_PASSWORD` – senha definida para a Equipe Pedagógica.
- `CORA_SESSION_SECRET` – uma string aleatória de no mínimo 32 caracteres, preferencialmente 48 caracteres ou mais.

Configure todas com escopo Functions, marque como sensíveis/secretas e aplique um novo deploy. Não coloque valores em `netlify.toml` ou GitHub. É recomendável trocar as senhas compartilhadas por senhas longas antes de disponibilizar o acesso publicamente. Se a equipe crescer, migrar para contas individuais com recuperação e revogação de acesso.

## Funcionamento

1. Depois da configuração, ao abrir o mesmo link surgem os dois blocos de entrada.
2. Gestão: usa a senha administrativa e acessa o calendário existente; pode escrever comunicados e clicar em **Publicar para equipe**.
3. Equipe: usa a senha de consulta; recebe apenas os eventos e avisos já publicados, sem ferramentas de edição.
4. A Gestão precisa publicar o primeiro lote para o painel da Equipe ter dados. Salvar no navegador não publica.
5. Alertas do sino são exibidos enquanto a página está aberta, inclusive com atualização periódica. **Não há push de segundo plano com aplicativo fechado nesta etapa.**
6. Arquivos Word e anexos salvos apenas no IndexedDB do navegador administrativo não são sincronizados; o calendário PDF original fica disponível pelas páginas institucionais do projeto.

## Notas de segurança

- O bloqueio de publicação é implementado no servidor (gestão apenas), não só no layout.
- O HTML/JavaScript do calendário são arquivos estáticos de um repositório público. O login restringe dados publicados pela API, não impede que arquivos estáticos públicos sejam lidos.
- O armazenamento no Netlify Blobs é ideal para uma direção com poucas publicações; gravações simultâneas podem exigir gestão de versões no futuro.
- Testado localmente: Node.js --check de todos os scripts; testes de autenticação, sessão, leitura e bloqueio de publicação pelo perfil Equipe em API simulada. Não foi possível completar teste visual automatizado no navegador por bloqueio do ambiente de execução.

## Ativação de produção (2026-11-01)

As credenciais são armazenadas nas variáveis protegidas do Netlify. Após alterações em `CORA_SESSION_SECRET`, publique uma nova versão para que a função de autenticação leia a chave atual. Não inclua valores secretos no repositório.
