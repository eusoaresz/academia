# Academia

API e interface web para gerenciamento de uma academia. O projeto está organizado como um monorepo simples, com um backend em Node.js/TypeScript e um frontend em React/Vite.

## Estado atual

### Cadastro e login de clientes (requisito 4)

A página inicial abre a área do cliente (`/#cliente`), com cadastro, login,
perfil da conta autenticada e saída. A gestão existente continua em `/#gestao`.
Clientes são contas próprias no modelo `Cliente`: criar uma conta não cria uma
matrícula nem escolhe um plano. Alunos e instrutores existentes são preservados;
seus registros não são convertidos automaticamente em contas de clientes.

| Método | Endpoint | Uso |
| --- | --- | --- |
| POST | `/clientes/cadastro` | Nome, e-mail, telefone e senha de 8 a 100 caracteres |
| POST | `/clientes/login` | E-mail e senha; retorna JWT com validade de uma hora |
| GET | `/clientes/me` | Perfil da própria conta, usando `Authorization: Bearer <token>` |

O e-mail é normalizado e único. Senhas usam hash com salt e não são retornadas.
A sessão do cliente fica apenas em memória e termina ao sair, recarregar ou
expirar. A opção “Manter conectado” do requisito 5 ainda não faz parte deste fluxo.
A proteção das rotas administrativas continua pendente no requisito 8.

### Login de instrutores

O painel de gestão (`/#gestao`) exige autenticação de instrutor. O fluxo usa
JWT com emissor e audiência próprios, sem compartilhar tokens com clientes.

| Método | Endpoint | Uso |
| --- | --- | --- |
| POST | `/instrutores/login` | E-mail e senha; retorna perfil e JWT com validade de uma hora |
| GET | `/instrutores/me` | Perfil do instrutor autenticado, usando `Authorization: Bearer <token>` |

O seed cria o instrutor de desenvolvimento `rafael@movimente.com` com a senha
`123456`. As sessões do painel ficam apenas em memória no navegador.

Após instalar as dependências do backend, execute `npx prisma generate` e
`npx prisma migrate deploy` para preparar o cliente Prisma e a nova tabela.
Configure `DATABASE_URL` e `JWT_KEY` no backend. Execute `npm test` em `back-end`
para verificar cadastro, login e acesso autenticado com banco simulado, sem
alterar dados do Neon.

O banco foi modelado para os seguintes recursos:

- alunos;
- instrutores, representados pelo modelo `Instrutor`;
- planos;
- treinos;
- pagamentos.

A rota de alunos e a rota de instrutores oferecem operações de consulta, criação, edição e exclusão alinhadas ao schema Prisma.

## Estrutura do projeto

```text
academia/
├── back-end/
│   ├── lib/prisma.ts             # Instância do Prisma Client
│   ├── prisma/schema.prisma      # Modelos e enums do banco
│   ├── prisma/migrations/        # Histórico de migrações
│   ├── src/routes/
│   │   ├── alunos.ts
│   │   ├── instrutores.ts
│   │   ├── login.ts
│   │   └── planos.ts
│   ├── src/server.ts             # Servidor Express
│   ├── package.json
│   └── .env                      # Não versionar
└── front-end/
		├── src/                      # Aplicação React
		├── public/                   # Arquivos públicos
		├── index.html
		└── package.json
```

## Tecnologias

### Backend

- Node.js e TypeScript;
- Express 5;
- CORS;
- Zod para validação dos corpos das requisições;
- Prisma Client;
- PostgreSQL;
- `bcrypt` e `jsonwebtoken` preparados para autenticação.

### Frontend

- React 19;
- Vite;
- TypeScript;
- `lucide-react` para ícones.

## Modelos do banco

O schema está em [`back-end/prisma/schema.prisma`](back-end/prisma/schema.prisma).

### Aluno

Campos: `id_aluno`, `nome`, `data_nascimento`, `email`, `telefone`, `data_cadastro`, `foto`, `id_plano` e `status`.

`id_aluno` é gerado automaticamente. `status` é preenchido pelo banco com a data atual, pois está definido como `DateTime @default(now())`.

### Treino

Campos: `id_treino`, `id_aluno`, `id_instrutor`, `objetivo`, `observacoes`, `data_entrada` e `data_saida`.

### Instrutor

O modelo se chama `Instrutor` e é persistido na tabela `instrutores`. Campos: `id_instrutor`, `nome`, `email`, `senha`, `telefone`, `especialidade`, `ativo` e `foto`.

### Plano

Campos: `id_plano`, `nome_plano`, `descricao`, `duracao_meses`, `valor_plano` e `ativo`.

### Pagamento

Campos: `id_pagamento`, `id_aluno`, `id_plano`, `data_pagamento`, `data_vencimento`, `valor`, `metodo` e `status_pagamento`.

Os valores permitidos são:

- `metodo`: `Dinheiro`, `Cartao` ou `PIX`;
- `status_pagamento`: `Pendente`, `Pago` ou `Atrasado`.

## Rotas do backend

O servidor escuta na porta `3000` por padrão.

### Alunos

Base: `http://localhost:3000/alunos`

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/alunos` | Lista todos os alunos |
| `GET` | `/alunos/:id` | Busca um aluno por `id_aluno` |
| `GET` | `/alunos/pesquisa/:termo` | Pesquisa por ID, nome ou e-mail |
| `POST` | `/alunos` | Cadastra um aluno |
| `PUT` | `/alunos/:id` | Atualiza um aluno |
| `DELETE` | `/alunos/:id` | Exclui um aluno |

Exemplo de corpo para `POST /alunos` ou `PUT /alunos/:id`:

```json
{
	"nome": "Joao da Silva",
	"data_nascimento": 1995,
	"email": "joao@example.com",
	"telefone": 11999999999,
	"data_cadastro": "2026-09-09",
	"foto": "joao.jpg",
	"id_plano": 1
}
```

As respostas de validação usam status `400`. Um aluno inexistente retorna `404` na consulta por ID. Erros inesperados do banco retornam `500` nas consultas e `400` nas operações de escrita atuais.

### Instrutores e outras rotas

O servidor registra atualmente:

```text
/planos
/instrutores
/instrutores/login
```

As rotas de instrutores usam exclusivamente o modelo `Instrutor` definido no schema atual. Também estão disponíveis `/treinos` e `/pagamentos`.

## Configuração local

### Pré-requisitos

- Node.js instalado;
- PostgreSQL disponível;
- banco de dados criado;
- variável `DATABASE_URL` configurada.

Crie `back-end/.env` com uma URL válida:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/academia"
JWT_KEY="uma-chave-local-desenvolvimento"
```

Não versione arquivos `.env`. O `.gitignore` da raiz já ignora variáveis de ambiente, dependências, builds e arquivos gerados.

## Instalação e execução

### Backend

```powershell
cd back-end
npm install
npx prisma validate
npx prisma generate
```

Para criar/aplicar uma migração em desenvolvimento:

```powershell
npx prisma migrate dev --name inicial
```

Ou, quando não for necessário criar histórico de migração:

```powershell
npx prisma db push
```

O backend ainda não possui um script `dev` configurado no `package.json`. Até que ele seja adicionado, o servidor deve ser executado com um executor TypeScript, por exemplo:

```powershell
npx tsx src/server.ts
```

### Frontend

```powershell
cd front-end
npm install
npm run dev
```

O Vite exibirá no terminal a URL local da aplicação, normalmente `http://localhost:5173`.

## Comandos úteis

Executados dentro de `back-end`:

```powershell
npx prisma validate       # Valida o schema
npx prisma generate       # Gera o Prisma Client
npx prisma migrate status # Mostra o estado das migrações
npx prisma studio         # Abre o Prisma Studio
```

Executados dentro de `front-end`:

```powershell
npm run dev               # Servidor de desenvolvimento
npm run build             # Typecheck e build de produção
npm run lint              # Verificação com Oxlint
npm run preview           # Pré-visualização do build
```

## Pendências conhecidas

1. Adicionar relações `@relation` entre alunos, planos, treinos, instrutores e pagamentos.
2. Adicionar testes para validação das rotas e integração com o banco.
3. Adicionar scripts de desenvolvimento e produção adicionais ao `back-end/package.json`.

## Contribuição

Antes de criar um commit:

```powershell
git status
git diff
```

Não inclua `node_modules`, `.env`, builds ou o Prisma Client gerado. Use commits pequenos e descritivos, por exemplo:

```text
✨ feat: adaptar rota de alunos ao schema Prisma
♻️ refactor: reorganizar rotas da academia
📝 docs: atualizar documentação do projeto
```
