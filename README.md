Esta documentação descreve os endpoints disponíveis na API, seus respectivos métodos, parâmetros necessários e o fluxo correto de execução para testes e apresentações.

URL Base da API: https://projetoav3-tec-production.up.railway.app/

Funcionamento do Front-end (Navegador)

O Front-end serve como a interface visual onde o usuário interage com o sistema. O fluxo de utilização na interface é direto e simplificado em duas etapas:

1.1. Autenticação: O usuário acessa a tela de login inicial para validar suas credenciais e entrar no sistema.

1.2. Pesquisa e Resumo: Após o login, o usuário visualiza seus livros através de um campo de pesquisa. Ao buscar pelo nome do livro, a interface exibe o conteúdo da obra e possibilita a geração do resumo correspondente.

Fazendo uso do Bruno API
Fluxo de Autenticação

2.1. Criar Novo Usuário (POST /registro)
Realiza o cadastro de um novo usuário no banco de dados, com armazenamento criptografado da senha.

Método: POST

Rota: /registro

Headers: Vazia

Body (JSON):
{ "email": "aluno@unifor.br", "senha": "123" }

2.2. Autenticação no Sistema (POST /login)
Valida as credenciais do usuário e retorna um Token de Acesso (Bearer Token) com validade de 1 hora.

Método: POST

Rota: /login

Headers: Vazia

Body (JSON):
{ "email": "aluno@unifor.br", "senha": "123" }

Nota: Guarde o código retornado no corpo da resposta (token); ele será obrigatório para as próximas requisições.

Endpoints de Consulta (Rotas Protegidas)

Importante: Todas as rotas abaixo exigem a inclusão do Token de Acesso no cabeçalho da Requisição.

Headers Name: Authorization

Headers Value: Bearer SEU_TOKEN_AQUI

3.1. Listar todos os Livros (GET /Livros)
Retorna a lista completa com todas as 8 obras cadastradas no banco de dados.

Método: GET

Rota: /livros

Body (JSON): Vazio

3.2. Consultar Livro Específico (GET /Livros/:id)
Retorna os detalhes de uma única obra com base no identificador fornecido na URL.

Método: GET

Rota: /livros/{id} (Substituir {id} por um número de 1 a 14)

Body (JSON): Vazio

Integrações com Inteligência Artificial

4.1. Geração de Resumo (POST /Livros/:id/resumo)
Envia o texto da obra selecionada para processamento em tempo real através da API do ChatGPT, retornando um resumo automatizado.

Método: POST

Rota: /livros/{id}/resumo (Substituir {id} por um número de 1 a 14)

Body (JSON): Vazio

Roteiro Sugerido para Demonstração

Para fins de apresentação, recomenda-se seguir estritamente a ordem cronológica dos blocos abaixo utilizando um cliente HTTP (como o Bruno ou Postman):

Cadastro: Execute a rota de registro para criar uma nova credencial.

Login: Efetue o login para gerar o Token de segurança e configure-o nas abas de Headers das rotas seguintes.

Listagem: Chame a rota de listagem geral para demonstrar a persistência de dados.

Processamento IA: Solicite o resumo de pelo menos duas obras distintas para comprovar o dinamismo e a leitura em tempo real por parte da Inteligência Artificial.
