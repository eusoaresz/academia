# Movimente — Academia

Aplicação full stack com React/Vite, Express/TypeScript, Prisma e PostgreSQL.
O catálogo público apresenta planos; clientes solicitam aulas experimentais e
administradores publicam horários, respondem solicitações e consultam gráficos.

## Executar localmente

Backend, em `back-end`:

```sh
npm ci
npx prisma generate
npx prisma migrate deploy
npm run admin:create
npm run dev
```

Crie `back-end/.env` conforme `.env.example`. O comando `admin:create` sugere
`victor@hotmail.com` e solicita nome e senha oculta. Não cria credenciais padrão
nem redefine senhas existentes. Cadastros de instrutores não concedem acesso de admin.

Frontend, em `front-end`:

```sh
npm ci
npm run dev
```

Configure `VITE_API_URL` conforme `.env.example`. A API usa porta 3000 por padrão;
o Vite normalmente usa 5173. Se usar outra porta, adicione sua origem em
`FRONTEND_URL` no backend.

## Fluxo principal

- `/#cliente`: catálogo público, busca, destaques, detalhes, cadastro e login.
- Após login: Minha conta e Meus agendamentos. O cliente vê apenas suas solicitações.
- Manter conectado salva UUID em `clienteId` e sessão validada em LocalStorage,
  por até 7 dias. Sem a opção, usa SessionStorage, com validade de uma hora.
- A restauração consulta `/clientes/me`; o UUID local sozinho não autentica.
- Sair limpa os dados locais. O token emitido expira no servidor conforme sua validade.
- `/#gestao`: login de administrador. Tokens de cliente/instrutor não autorizam gestão.
- Planos: cadastro, alteração e campo Destaque. Inativos não aparecem no catálogo.
- Horários: o administrador publica uma vaga por data/hora e plano, em Brasília.
- Agendamentos: confirmar, recusar ou cancelar com resposta registrada no histórico.
- Dashboard: gráficos reais de agendamentos por status e interesse por plano.
- Informações IA: consulta real à OpenAI, com texto, modelo e data salvos no plano.

O cliente não precisa se matricular para criar uma conta. A conta `Cliente` é
separada dos cadastros legados de Aluno, Instrutor, Treino e Pagamento.
O [modelo E-R](docs/modelo-er.md) descreve as cinco tabelas relacionadas do fluxo.

## API

| Método | Endpoint | Acesso |
| --- | --- | --- |
| POST | `/clientes/cadastro`, `/clientes/login` | Público |
| GET | `/clientes/me` | Cliente |
| GET | `/planos?busca=termo&destaque=true`, `/planos/:id` | Público, somente ativos |
| GET | `/horarios?plano=1` | Público, somente vagas futuras livres |
| POST | `/agendamentos` | Cliente; recebe id_horario e observacao_cliente |
| GET | `/agendamentos/meus` | Cliente autenticado |
| PATCH | `/agendamentos/:id/cancelar` | Dono da solicitação |
| POST | `/admin/login` | Público |
| GET | `/admin/me`, `/admin/dashboard` | Admin |
| GET | `/agendamentos`, `/horarios/gestao`, `/planos/gestao` | Admin |
| PATCH | `/agendamentos/:id/resposta` | Admin |
| POST/PATCH | `/horarios`, `/horarios/:id` | Admin |
| POST/PUT/DELETE | `/planos`, `/planos/:id` | Admin |
| POST | `/planos/:id/ia` | Admin |
| CRUD | `/alunos`, `/instrutores`, `/treinos`, `/pagamentos` | Admin |

Rotas protegidas exigem `Authorization: Bearer <token>`. Reservas simultâneas
são controladas por transação e índice único parcial no PostgreSQL.

## Testes e produção

```sh
# back-end
npm test
npm run test:integration
npm run build
npm start

# front-end
npm run build
npm run lint
```

Os testes unitários não usam o banco. Os testes de integração usam o banco
configurado, criam dados exclusivos e removem somente esses dados ao terminar.
O seed antigo é destrutivo e não deve ser executado para preparar produção.

O guia [Publicação](docs/publicacao.md) contém a configuração de Vercel, Render,
Neon e IA. `render.yaml` e `front-end/vercel.json` estão prontos para configuração.
Não há publicação confirmada nem chave de IA configurada nesta entrega. O recurso
de IA fica disponível após definir `OPENAI_API_KEY` e `OPENAI_MODEL` no servidor;
nenhum texto fictício é apresentado como consulta real.

## Situação dos requisitos do trabalho

1. Catálogo público de planos: implementado.
2. Pesquisa e destaques: implementados; selecionar destaques na gestão.
3. Consulta à IA: integração implementada; falta chave/modelo e geração real.
4. Cadastro e login de clientes: implementados.
5. Manter conectado com UUID no LocalStorage: implementado.
6. Detalhes e interação autenticada: implementados.
7. Minhas interações e respostas: implementados.
8. Área restrita de administradores: implementada; criar credencial localmente.
9. Dashboard com gráficos: implementado.
10. Listagem e cadastro de planos: implementados.
11. Gestão e respostas das interações: implementadas.
12. Deploy completo: preparado, ainda depende das contas e serviços de hospedagem.
