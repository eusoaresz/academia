/# Backend de Gestão (full_262_back)

Descrição curta
-
Projeto backend em Node/TypeScript que usa Prisma como ORM e PostgreSQL como banco de dados. O schema Prisma define entidades para gerenciar alunos, treinos, instrutores (clientes), planos e pagamentos.

Modelos principais (baseado em `prisma/schema.prisma`)
- **Aluno**: representa alunos com campos como `id_aluno`, `nome`, `data_nascimento`, `email`, `telefone`, `id_plano` e `status`.
- **Treino**: registros de treino vinculados a `id_aluno` e `id_instrutor`, com `objetivo`, `observacoes`, `data_entrada` e `data_saida`.
- **Cliente**: usado aqui como instrutor (`id_instrutor`, `nome`, `email`, `especialidade`, `ativo`, `foto`).
- **Plano**: planos disponíveis (`id_plano`, `nome_plano`, `descricao`, `duracao_meses`, `valor_plano`, `ativo`).
- **Pagamento**: pagamentos de planos (`id_pagamento`, `id_aluno`, `id_plano`, `data_pagamento`, `data_vencimento`, `valor`, `metodo`, `status_pagamento`).

Enums úteis
- `MetodoPagamento` — `Dinheiro`, `Cartao`, `PIX`.
- `StatusPagamento` — `Pendente`, `Pago`, `Atrasado`.

Arquivos importantes
- `prisma/schema.prisma` — modelo de dados Prisma.
- `prisma.config.ts` — configuração do Prisma (a conexão `DATABASE_URL` é gerenciada aqui para Prisma v7).
- `src/` — código fonte do servidor (ex.: `src/server.ts`).

Pré-requisitos
- Node.js (versão compatível com seu `package.json`)
- PostgreSQL (ou um serviço compatível)
- Variável de ambiente `DATABASE_URL` configurada (ex.: em `.env`).

Instruções rápidas (PowerShell)
1. Instale dependências:
```powershell
npm install
```
2. Defina a variável `DATABASE_URL` (no `.env` ou no ambiente). Exemplo de `.env`:
```text
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```
3. Validar schema Prisma:
```powershell
npx prisma validate
```
4. Gerar o client Prisma:
```powershell
npx prisma generate
```
5. Aplicar esquema ao banco (escolha o fluxo que prefere):
```powershell
# Usando migrações (recomendado para dev com histórico):
npx prisma migrate dev --name ajuste-schema

# Ou sincronizar sem criar migração:
npx prisma db push
```
6. Iniciar servidor (substitua pelo script real do `package.json`):
```powershell
npm run dev
```

Sobre a imagem/diagrama
Se você tem um diagrama ER ou imagem ilustrativa, coloque-a em `docs/diagram.png` (ou atualize o caminho abaixo) e adicione referência aqui. Exemplo de markdown para inserir a imagem:
```markdown
![Diagrama ER](docs/diagram.png)
```

Notas finais
- O `schema.prisma` foi adaptado para Prisma v7: a conexão de banco é configurada em `prisma.config.ts` em vez de `url` no `schema.prisma`.
- Posso ajudar a adicionar relações (`@relation`) explícitas entre modelos, ajustar tipos (`telefone` como `String`, `data_nascimento` como `DateTime`) ou gerar um diagrama ER a partir do schema — quer que eu faça isso agora?
# acaemia
